import pandas as pd
import textwrap

from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from django.http import HttpResponse


from .models import Project, Dataset, ProteinSequence, GeneExpression
from .serializers import ProteinSequenceSerializer, GeneExpressionSerializer


# Helpers

def get_authorized_dataset(request, dataset_id: int, project_id: int | None = None) -> Dataset:
    """
    Returns a dataset if the requesting user is allowed to see it:
    - owned by the user OR is_default=True
    - (optional) belongs to the given project
    Raises 404 if not found or not authorized.
    """
    base = Dataset.objects.filter(id=dataset_id).filter(
        # user-owned dataset
        owner=request.user
    ) | Dataset.objects.filter(id=dataset_id, is_default=True)

    if project_id:
        base = base.filter(project_id=project_id)

    ds = base.first()
    if not ds:
        # Hide existence details behind 404
        raise get_object_or_404(Dataset, id=-1)  # always 404
    return ds


def get_or_create_dataset_for_upload(request, project_id: int | None, dataset_id: int | None, dataset_name: str | None) -> Dataset:
    """
    For uploads:
    - If dataset_id provided -> fetch & authorize it.
    - Else require (project_id AND dataset_name) -> get_or_create within that project for this user.
    """
    if dataset_id:
        return get_authorized_dataset(request, dataset_id=dataset_id, project_id=project_id)

    if not project_id or not dataset_name:
        raise ValueError("Provide dataset_id OR (project_id and dataset_name)")

    project = get_object_or_404(Project, id=project_id, owner=request.user)

    ds, _ = Dataset.objects.get_or_create(
        project=project,
        name=dataset_name,
        defaults={"owner": request.user}
    )
    return ds


# Query APIs

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_sequences(request):
    genes = request.GET.get('genes')
    dataset_id = request.GET.get('dataset')
    project_id = request.GET.get('project')  # optional

    if not genes or not dataset_id:
        return Response({"error": "Please provide ?genes=...&dataset=ID"}, status=400)

    try:
        dataset = get_authorized_dataset(request, int(dataset_id), int(project_id) if project_id else None)
    except Exception:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    gene_list = [g.strip() for g in genes.split(',') if g.strip()]
    qs = ProteinSequence.objects.filter(dataset=dataset, gene_name__in=gene_list)
    return Response(ProteinSequenceSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_expression(request):
    genes = request.GET.get('genes')
    dataset_id = request.GET.get('dataset')
    project_id = request.GET.get('project')  # optional
    samples = request.GET.get('samples')     # optional

    if not genes or not dataset_id:
        return Response({"error": "Please provide ?genes=...&dataset=ID"}, status=400)

    try:
        dataset = get_authorized_dataset(request, int(dataset_id), int(project_id) if project_id else None)
    except Exception:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    gene_list = [g.strip() for g in genes.split(',') if g.strip()]

    qs = GeneExpression.objects.filter(dataset=dataset, gene__gene_name__in=gene_list)
    if samples:
        sample_list = [s.strip() for s in samples.split(',') if s.strip()]
        qs = qs.filter(sample_id__in=sample_list)

    return Response(GeneExpressionSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_genes(request):
    dataset_id = request.GET.get('dataset')
    if not dataset_id:
        return Response({"error": "Please provide ?dataset=ID"}, status=400)

    q = (request.GET.get('q') or "").strip()
    limit = int(request.GET.get('limit') or 50)

    qs = ProteinSequence.objects.filter(dataset_id=dataset_id)
    if q:
        qs = qs.filter(gene_name__icontains=q)
    qs = qs.order_by('gene_name').values_list("gene_name", flat=True)[:limit]

    return Response(list(qs))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_samples(request):
    dataset_id = request.GET.get('dataset')
    project_id = request.GET.get('project')  # optional

    if not dataset_id:
        return Response({"error": "Please provide ?dataset=ID"}, status=400)

    try:
        dataset = get_authorized_dataset(request, int(dataset_id), int(project_id) if project_id else None)
    except Exception:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    qs = GeneExpression.objects.filter(dataset=dataset).values_list("sample_id", flat=True).distinct()
    return Response(list(qs))


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_expression_matrix(request):
    genes = request.GET.get('genes')
    dataset_id = request.GET.get('dataset')
    project_id = request.GET.get('project')  # optional

    if not genes or not dataset_id:
        return Response({"error": "Please provide ?genes=...&dataset=ID"}, status=400)

    try:
        dataset = get_authorized_dataset(request, int(dataset_id), int(project_id) if project_id else None)
    except Exception:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    gene_list = [g.strip() for g in genes.split(',') if g.strip()]

    qs = GeneExpression.objects.filter(dataset=dataset, gene__gene_name__in=gene_list)
    df = pd.DataFrame(list(qs.values("gene__gene_name", "sample_id", "expression_value")))
    if df.empty:
        return Response({"error": "No data found"}, status=404)

    pivot = df.pivot(index="gene__gene_name", columns="sample_id", values="expression_value").fillna(0)
    return JsonResponse(pivot.to_dict(orient="index"))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_fasta(request):
    """
    GET /api/sequences/fasta/?dataset=<id>&genes=G1,G2,G3
    Returns a text/plain FASTA file (as attachment).
    """
    dataset_id = request.GET.get("dataset")
    genes = request.GET.get("genes")

    if not dataset_id or not genes:
        return Response({"error": "Please provide ?dataset=ID&genes=geneA,geneB"}, status=400)

    requested = [g.strip() for g in genes.replace("\n", ",").split(",") if g.strip()]
    qs = ProteinSequence.objects.filter(dataset_id=dataset_id, gene_name__in=requested)

    # Map for preserving the input order
    seq_by_name = {p.gene_name: p.sequence for p in qs}

    lines = []
    for g in requested:
        seq = seq_by_name.get(g)
        if not seq:
            # include a comment so the user knows it was missing
            lines.append(f"; WARN: {g} not found in dataset {dataset_id}")
            continue
        lines.append(f">{g}")
        lines.extend(textwrap.wrap(seq, width=60))

    content = "\n".join(lines) + "\n"
    ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    resp = HttpResponse(content, content_type="text/plain; charset=utf-8")
    resp["Content-Disposition"] = f'attachment; filename="genes_{dataset_id}_{ts}.fasta"'
    return resp

# Upload APIs

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_fasta(request):
    project_id = request.data.get("project_id")
    dataset_id = request.data.get("dataset_id")
    dataset_name = request.data.get("dataset_name")

    try:
        dataset = get_or_create_dataset_for_upload(
            request,
            int(project_id) if project_id else None,
            int(dataset_id) if dataset_id else None,
            dataset_name
        )
    except ValueError as ve:
        return Response({"error": str(ve)}, status=400)
    except Dataset.DoesNotExist:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    fasta_file = request.FILES.get('file')
    if not fasta_file:
        return Response({"error": "No file uploaded"}, status=400)

    content = fasta_file.read().decode("utf-8").splitlines()
    gene_name, seq = None, []

    for line in content:
        if line.startswith(">"):
            if gene_name:
                ProteinSequence.objects.update_or_create(
                    dataset=dataset,
                    gene_name=gene_name,
                    defaults={"sequence": "".join(seq)}
                )
            gene_name = line[1:].strip()
            seq = []
        else:
            seq.append(line.strip())

    if gene_name:
        ProteinSequence.objects.update_or_create(
            dataset=dataset,
            gene_name=gene_name,
            defaults={"sequence": "".join(seq)}
        )

    return Response({"status": f"FASTA imported into dataset {dataset.id}"})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_tsv(request):
    project_id = request.data.get("project_id")
    dataset_id = request.data.get("dataset_id")
    dataset_name = request.data.get("dataset_name")

    try:
        dataset = get_or_create_dataset_for_upload(
            request,
            int(project_id) if project_id else None,
            int(dataset_id) if dataset_id else None,
            dataset_name
        )
    except ValueError as ve:
        return Response({"error": str(ve)}, status=400)
    except Dataset.DoesNotExist:
        return Response({"error": "Dataset not found or not authorized"}, status=404)

    tsv_file = request.FILES.get('file')
    if not tsv_file:
        return Response({"error": "No file uploaded"}, status=400)

    content = tsv_file.read().decode("utf-8").splitlines()
    if not content:
        return Response({"error": "Empty file"}, status=400)

    headers = content[0].split("\t")
    if len(headers) < 2 or headers[0].lower() not in ("gene-id", "gene", "gene_name", "geneid"):
        return Response({"error": "Invalid TSV header. First column must be gene-ID"}, status=400)

    samples = headers[1:]

    for row in content[1:]:
        if not row.strip():
            continue
        parts = row.split("\t")
        gene_name = parts[0].strip()
        values = parts[1:]
        if not gene_name:
            continue

        gene, _ = ProteinSequence.objects.get_or_create(
            dataset=dataset, gene_name=gene_name, defaults={"sequence": ""}
        )

        for sample, val in zip(samples, values):
            try:
                v = float(val)
            except (TypeError, ValueError):
                continue  

            GeneExpression.objects.update_or_create(
                dataset=dataset,
                gene=gene,
                sample_id=sample.strip(),
                defaults={"expression_value": v}
            )

    return Response({"status": f"TSV imported into dataset {dataset.id}"})


# Project & Dataset APIs


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def projects(request):
    if request.method == 'POST':
        name = request.data.get('name')
        if not name:
            return Response({"error": "name required"}, status=400)
        proj, _ = Project.objects.get_or_create(name=name, owner=request.user)
        return Response({"id": proj.id, "name": proj.name}, status=201)


    qs = Project.objects.filter(owner=request.user)
    return Response([{"id": p.id, "name": p.name} for p in qs])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_datasets(request):
    project_id = request.GET.get('project')

    q = Dataset.objects.filter(owner=request.user) | Dataset.objects.filter(is_default=True)
    if project_id:
        q = q.filter(project_id=project_id)

    return Response([
        {"id": d.id, "name": d.name, "is_default": d.is_default, "project": d.project_id}
        for d in q.order_by("project_id", "name")
    ])

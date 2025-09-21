from rest_framework import serializers
from .models import ProteinSequence, GeneExpression

class ProteinSequenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProteinSequence
        fields = ['id', 'gene_name', 'sequence']

class GeneExpressionSerializer(serializers.ModelSerializer):
    gene_name = serializers.CharField(source="gene.gene_name", read_only=True)

    class Meta:
        model = GeneExpression
        fields = ['id', 'gene_name', 'sample_id', 'expression_value']

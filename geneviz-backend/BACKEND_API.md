# GeneViz Backend API Guide (Projects + Datasets)

This guide covers auth, **projects**, **datasets**, uploads, and query endpoints. Copy/paste the commands to test locally.

---

## Base URL

* Local dev: `http://127.0.0.1:8000/`

All authenticated requests must include:

```
Authorization: Token <YOUR_TOKEN>
```

---

## 🔑 Authentication

### Get Token

```bash
curl -X POST -d "username=<username>&password=<password>" \
     http://127.0.0.1:8000/api-token-auth/
```

**Response**

```json
{"token": "abc123def456"}
```

Use this token in all further requests, e.g. `-H "Authorization: Token abc123def456"`.

---

## 🗂️ Project Management

### Create / List Projects

```bash
# Create
curl -H "Authorization: Token <TOKEN>" -X POST \
  -d "name=VC-Study-01" http://127.0.0.1:8000/api/projects/

# List
curl -H "Authorization: Token <TOKEN>" \
  http://127.0.0.1:8000/api/projects/
```

**Create Response**

```json
{"id": 10, "name": "VC-Study-01"}
```

**List Response**

```json
[{"id": 10, "name": "VC-Study-01"}]
```

> Projects are owned by the user. Datasets are scoped under a project.

---

## 📂 Dataset Management

### List Datasets (optionally filter by project)

```bash
# All visible to you (owned + defaults)
curl -H "Authorization: Token <TOKEN>" \
  http://127.0.0.1:8000/api/datasets/

# Only within a project
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/datasets/?project=10"
```

**Response**

```json
[
  {"id": 2, "name": "MyExperiment1", "is_default": false, "project": 10}
]
```

---

## ⬆️ Upload APIs

Uploads require either **dataset\_id** *or* (**project\_id** + **dataset\_name**). If you pass project+name, the backend will **get or create** the dataset inside that project for the current user.

### Upload FASTA (protein sequences)

```bash
# Using project + dataset name (recommended during creation)
curl -H "Authorization: Token <TOKEN>" -X POST \
  -F "project_id=10" \
  -F "dataset_name=MyExperiment1" \
  -F "file=@/ABS/PATH/STRG0A60OAF.protein.sequences.v12.0.fa" \
  http://127.0.0.1:8000/api/upload/fasta/

# Or target an existing dataset by id
curl -H "Authorization: Token <TOKEN>" -X POST \
  -F "dataset_id=2" \
  -F "file=@/ABS/PATH/STRG0A60OAF.protein.sequences.v12.0.fa" \
  http://127.0.0.1:8000/api/upload/fasta/
```

**Response**

```json
{"status": "FASTA imported into dataset 2"}
```

### Upload TSV (gene × sample expression matrix)

TSV header must be: `gene-ID\t<Sample1>\t<Sample2>...`

```bash
# Reuse same dataset (project + name)
curl -H "Authorization: Token <TOKEN>" -X POST \
  -F "project_id=10" \
  -F "dataset_name=MyExperiment1" \
  -F "file=@/ABS/PATH/all_samples.tsv" \
  http://127.0.0.1:8000/api/upload/tsv/

# Or by dataset id
curl -H "Authorization: Token <TOKEN>" -X POST \
  -F "dataset_id=2" \
  -F "file=@/ABS/PATH/all_samples.tsv" \
  http://127.0.0.1:8000/api/upload/tsv/
```

**Response**

```json
{"status": "TSV imported into dataset 2"}
```

> Tip: Use the same `project_id` + `dataset_name` for FASTA and TSV to combine both into a single dataset.

---

## 🔍 Query APIs

All query endpoints require `dataset=ID`. You may also include `project=ID` for extra safety.

### List Genes (autocomplete)

```bash
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/genes/?project=10&dataset=2"
```

**Response**

```json
[
  "VaccDscaff1-augustus-gene-0.27",
  "VaccDscaff1-augustus-gene-0.30"
]
```

### List Samples (autocomplete)

```bash
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/samples/?project=10&dataset=2"
```

**Response**

```json
[
  "SRR24002868",
  "SRR24002873",
  "SRR24002879",
  "SRR24002870",
  "SRR24002875",
  "SRR24002881"
]
```

### Get Sequences for Selected Genes

```bash
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/sequences/?project=10&dataset=2&genes=VaccDscaff1-augustus-gene-0.27,VaccDscaff1-augustus-gene-0.30"
```

**Response (snippet)**

```json
[
  {"gene_name": "VaccDscaff1-augustus-gene-0.27", "sequence": "YPVYLQFTFHPKQLKSKRACELGKRKPGGNEMELDDWELSTEDLDSL..."},
  {"gene_name": "VaccDscaff1-augustus-gene-0.30", "sequence": "MDVSGTVVRPLPNLIGSSSGMEIYSNSPTSVSFLSFDDGRRNHRLS..."}
]
```

### Get Expression (long format; good for box/violin)

Optional: `samples=SRR24002868,SRR24002873`

```bash
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/expression/?project=10&dataset=2&genes=VaccDscaff1-augustus-gene-0.27&samples=SRR24002868,SRR24002873"
```

**Response**

```json
[
  {"gene_name": "VaccDscaff1-augustus-gene-0.27", "sample_id": "SRR24002868", "expression_value": 2095.0},
  {"gene_name": "VaccDscaff1-augustus-gene-0.27", "sample_id": "SRR24002873", "expression_value": 3234.0}
]
```

### Get Expression Matrix (heatmap-ready)

Rows = genes, columns = samples, values = expression.

```bash
curl -H "Authorization: Token <TOKEN>" \
  "http://127.0.0.1:8000/api/expression-matrix/?project=10&dataset=2&genes=VaccDscaff1-augustus-gene-0.27,VaccDscaff1-augustus-gene-0.30"
```

**Response**

```json
{
  "VaccDscaff1-augustus-gene-0.27": {
    "SRR24002868": 2095,
    "SRR24002873": 3234,
    "SRR24002879": 1604,
    "SRR24002870": 2289,
    "SRR24002875": 1436,
    "SRR24002881": 2413
  },
  "VaccDscaff1-augustus-gene-0.30": {
    "SRR24002868": 111,
    "SRR24002873": 222,
    "SRR24002879": 333,
    "SRR24002870": 444,
    "SRR24002875": 555,
    "SRR24002881": 666
  }
}
```

---

## ❗ Error Responses

* Missing params:

```json
{"error": "Please provide ?genes=...&dataset=ID"}
```

* No data for query:

```json
{"error": "No data found"}
```

* Missing file on upload:

```json
{"error": "No file uploaded"}
```

* Bad TSV header (first col must be gene id):

```json
{"error": "Invalid TSV header. First column must be gene-ID"}
```

* Unauthorized:

```json
{"detail": "Authentication credentials were not provided."}
```

* Dataset not visible to user / wrong project:

```json
{"error": "Dataset not found or not authorized"}
```

---

## 🔧 Setup Reminders

1. Enable apps in `settings.py`:

   * `rest_framework`, `rest_framework.authtoken`, `genes`
2. Migrate:

```bash
pipenv run python manage.py migrate
```

3. Create user:

```bash
pipenv run python manage.py createsuperuser
```

4. Get token via `/api-token-auth/`.

---

## 💡 Tips

* Always include `dataset=ID` in query endpoints; add `project=ID` to be explicit.
* Use `/api/projects/` then `/api/datasets/?project=ID` to scope work.
* Prefer uploads with `project_id + dataset_name` to keep FASTA & TSV in the **same** dataset.
* For explicit targeting, use `dataset_id` in uploads.

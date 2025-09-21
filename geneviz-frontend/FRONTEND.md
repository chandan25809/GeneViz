# GeneViz Frontend Guide

A quick, practical guide to the GeneViz React/Ant Design frontend: what each screen does, how charts are generated, and the rules behind the visuals.

> Tech stack: **React + TypeScript**, **Ant Design** (UI), **Plotly** (charts), **react-grid-layout** (drag/resize), REST API client in `src/api`.

---

## Contents

* [Theme & Layout](#theme--layout)
* [Auth: Login](#auth-login)
* [Projects](#projects)
* [Upload Dataset Modal](#upload-dataset-modal)
* [Workstation](#workstation)

  * [Toolbar](#toolbar)
  * [Chart Cards & Layout](#chart-cards--layout)
  * [Charts](#charts)

    * [Heatmap](#heatmap)
    * [Box Plot](#box-plot)
    * [Violin Plot](#violin-plot)
    * [Distribution (Histogram + KDE)](#distribution-histogram--kde)
    * [Table (Pivot)](#table-pivot)
    * [PCA (Samples)](#pca-samples)
* [Downloads](#downloads)
* [Persistence](#persistence)
* [Performance Notes](#performance-notes)
* [Accessibility & UX details](#accessibility--ux-details)
* [Troubleshooting](#troubleshooting)

---

## Theme & Layout

* **Light theme by default** with neutral background `#f7f9fc`, container `#fff`, primary `#1677ff`.
* Global styles in `App.css` and `index.css` ensure consistent text color and light inputs/tables.
* **App shell** uses Ant Design `Layout`:

  * Top **Header** with app title & *Sign out*.
  * Optional light **Sider** menu (Projects).
  * **Content** is centered with responsive max-width.

---

## Auth: Login

* Route: `/login`
* Ant Design `Form` with `username` + `password`.
* On success → redirect to prior protected route (or `/projects`).
* Error messages bubble from API (`response.data.detail`) or a generic fallback.

---

## Projects

* Route: `/projects`
* Shows user projects in an Ant Table.
* Actions:

  * **Add dataset** → opens *Upload Dataset* modal.
  * **Open** → navigates to Workstation for the selected dataset.

---

## Upload Dataset Modal

* Two tabs via `Segmented`:

  1. **Create new dataset**

     * Name + **FASTA** upload + **TSV** upload (manual upload flow).
     * File types: FASTA `.fa, .fasta, .faa, .txt`; TSV `.tsv, .txt`.
  2. **Use existing dataset**

     * Select from project datasets, click **Open**.

* After successful upload, the modal can trigger a callback to refresh list and/or open the dataset.

---

## Workstation

The workspace to **select genes**, **add charts**, **download data**, and **save layouts**.

### Toolbar

* **Gene picker**: multi-select with search (up to 200 hits). You can paste using comma/newline.
* **Chart picker + Add chart**:

  * Chart types: Heatmap, Box, Violin, Table, Distribution, PCA.
  * You **cannot add the same chart** twice for the *current selection* (dataset+gene set fingerprint).
* **Downloads**: Table CSV, Matrix CSV, FASTA.
* **Layout controls**:

  * *Edit layout* (toggle drag/resize)
  * *Save* (persist to localStorage)
  * *Reset* (clear saved layout)

### Chart Cards & Layout

* Cards are placed in a responsive grid (3 per row on large screens).
* Drag by the card title; resize using the handle.
* **Table** defaults to span **2 columns** for wider view.
* Body padding & height consistent to avoid visual jumps between rows.

---

## Charts

All charts are rendered via **Plotly** with autosize & responsive handlers.

### Heatmap

**What it shows**
Expression matrix for selected genes × samples.

**Data transform**

* Uses `/matrix` endpoint: `Record<gene, Record<sample, value>>`.
* `z` = raw/normalized expression values from the API.
* **Color scale**: *Viridis* (perceptually uniform, colorblind-friendly).

**UI**

* Smoothed (`zsmooth: "best"`), margin trimmed. Axis tick labels auto-rotate.

---

### Box Plot

**What it shows**
Distribution of expression for each gene across samples.

**Data transform**

* Uses long form `/expression`:

  * group by `gene_name`, plot each group as a box.

**UI**

* Legend on; compact margins.

---

### Violin Plot

**What it shows**
Similar to Box, but with a continuous density silhouette.

**Data transform**

* Same long data as Box.
* Each gene → one violin (points on, internal box hidden).

**UI**

* Legend on; compact margins.

---

### Distribution (Histogram + KDE)

**What it shows**
Per-gene histogram of expression values across samples, **overlaid** and smoothed with a **KDE curve**.

**Data transform**

* Long data grouped by `gene_name`.
* For each gene:

  * `histogram(x=expression_value, nbinsx≈√n)`
  * A KDE curve computed client-side (Gaussian kernel, Scott’s rule fallback).

**UI**

* `barmode: "overlay"` with partial opacity; x=Expression value, y=Count.

---

### Table (Pivot)

**What it shows**
A pivoted **gene × sample** table.

**Data transform**

* Prefer long data pivot (fallback to matrix if long not loaded).
* Columns: `gene-ID` (fixed left) + one column per unique sample.
* Pagination: 10 rows/page.
* Horizontal scroll when many samples; sticky header.

**Download parity**

* **Table CSV** mirrors the exact pivot table.

---

### PCA (Samples)

**What it shows**
Unsupervised projection of **samples** onto the first two principal components, built from the selected genes.

**Data transform**

1. Build matrix Samples × Genes with `log1p(expression_value)`.
2. **Z-score per gene** (column-wise) to equalize gene influence.
3. Compute sample × sample covariance.
4. Extract top two eigenvectors via power-iteration + deflation.
5. Plot **PC1 score** vs **PC2 score** for each sample.
6. Axis titles show **explained variance ratio**.

**Interpretation**

* Nearby dots = samples with similar profiles across the chosen genes.
* Axis sign can flip; relative distances matter.

---

## Downloads

* **Table CSV**: the exact pivot table visible in **Table (Pivot)**.
* **Matrix CSV**: gene × sample numeric matrix from `/matrix`.
* **FASTA**: sequences for selected genes (from `/fasta?dataset=…&genes=…`).

---

## Persistence

* Layouts (positions/sizes) are stored in `localStorage` under `gv_layouts_v1`.
* *Edit layout* must be on to drag/resize.
* **Save** writes layouts; **Reset** clears saved state.

---

## Performance Notes

* Gene search is **debounced (250ms)** and caps options to 200.
* Charts compute transforms in `useMemo` and only re-run when dependencies change.
* Table uses `tableLayout="fixed"` and renders only 10 rows/page.

---

## Accessibility & UX details

* Light theme with high-contrast defaults.
* Button tooltips where an action can be disabled (e.g., duplicate chart for same selection).
* Keyboard nav: form controls are native Ant components with focus rings.

---

## Troubleshooting

* **Chart won’t add**: You already added that chart for the current gene selection. Change genes or the chart type.
* **Empty plot**: Ensure you’ve selected genes; some charts require long-form data and will fetch `/expression`.
* **Layout looks odd**: Toggle *Edit layout*, resize the card, then **Save**.

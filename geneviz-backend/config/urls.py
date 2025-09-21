"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from genes import views
from rest_framework.authtoken.views import obtain_auth_token

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api-token-auth/', obtain_auth_token),

    # Project & Dataset APIs
    path('api/projects/', views.projects),            # GET list / POST create
    path('api/datasets/', views.list_datasets),       # GET (optional ?project=ID)

    # Query APIs (dataset-scoped; optional ?project=ID)
    path('api/sequences/', views.get_sequences),
    path('api/expression/', views.get_expression),
    path('api/expression-matrix/', views.get_expression_matrix),
    path('api/genes/', views.list_genes),
    path('api/samples/', views.list_samples),

    # Upload APIs (accept dataset_id OR project_id + dataset_name)
    path('api/upload/fasta/', views.upload_fasta),
    path('api/upload/tsv/', views.upload_tsv),

    path('api/sequences/fasta/', views.download_fasta),

]

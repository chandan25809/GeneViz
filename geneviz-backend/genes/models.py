from django.db import models
from django.contrib.auth.models import User

class Project(models.Model):
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("owner", "name")  # one project name per owner

    def __str__(self):
        return f"{self.name} (owner={self.owner_id})"


class Dataset(models.Model):
    name = models.CharField(max_length=255)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="datasets")
    owner = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # avoid duplicate dataset names inside the same project
            models.UniqueConstraint(fields=["project", "name"], name="uniq_project_dataset_name"),
        ]

    def __str__(self):
        return f"{self.name} [project={self.project_id}]"


class ProteinSequence(models.Model):
    gene_name = models.CharField(max_length=255)
    sequence = models.TextField()
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="sequences")

    def __str__(self):
        return self.gene_name


class GeneExpression(models.Model):
    gene = models.ForeignKey(ProteinSequence, on_delete=models.CASCADE, related_name="expressions")
    sample_id = models.CharField(max_length=100)
    expression_value = models.FloatField()
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE, related_name="expressions")

    class Meta:
        unique_together = ("gene", "sample_id", "dataset")

    def __str__(self):
        return f"{self.gene.gene_name} - {self.sample_id}"

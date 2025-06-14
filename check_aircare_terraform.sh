#!/bin/bash

echo "🔍 Vérification de l'état Terraform pour le projet AirCare..."

# 1. Initialiser Terraform si ce n’est pas déjà fait
echo "➡️ Initialisation de Terraform (si nécessaire)..."
terraform init -upgrade -input=false > /dev/null

# 2. Valider la syntaxe des fichiers .tf
echo "✅ Validation du code Terraform..."
terraform validate || { echo "❌ Erreur de validation Terraform"; exit 1; }

# 3. Liste des ressources gérées par Terraform
echo "📦 Liste des ressources Terraform :"
terraform state list || { echo "❌ Impossible de récupérer l’état Terraform"; exit 1; }

# 4. Vérification des ressources critiques
echo ""
REQUIRED_RESOURCES=(
  "aws_lambda_function.aircare_backend"
  "aws_api_gateway_rest_api.aircare_api"
  "aws_cloudfront_distribution.aircare_distribution"
  "aws_s3_bucket.frontend_bucket"
  "aws_dynamodb_table.history_table"
  "aws_cloudwatch_metric_alarm.lambda_alarm"
)

for resource in "${REQUIRED_RESOURCES[@]}"; do
  if terraform state list | grep -q "$resource"; then
    echo "✅ $resource trouvé dans l'état Terraform"
  else
    echo "❌ $resource manquant dans l'état Terraform"
    MISSING=true
  fi
done

# 5. Planification d’une mise à jour pour confirmer l’alignement
echo ""
echo "🔁 Génération d’un plan Terraform pour détecter d’éventuelles divergences..."
terraform plan -detailed-exitcode -out=tfplan > /dev/null
RESULT=$?

if [ $RESULT -eq 0 ]; then
  echo "🎉 Aucun changement à appliquer. L’infrastructure est parfaitement alignée avec le code Terraform."
elif [ $RESULT -eq 2 ]; then
  echo "⚠️ Des changements sont prévus. Exécutez 'terraform apply' si vous souhaitez les valider."
  terraform show tfplan
else
  echo "❌ Erreur lors de l’exécution de terraform plan"
  exit 1
fi


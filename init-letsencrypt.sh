#!/bin/bash

# --- CONFIGURACIÓN ---
# ¡¡¡CAMBIA ESTAS VARIABLES POR LAS TUYAS!!!
DOMAINS=("paquirobles.com" "www.paquirobles.com")
EMAIL="paqui.robles@paquirobles.com"
# --- FIN DE CONFIGURACIÓN ---


# --- NO MODIFICAR DEBAJO DE ESTA LÍNEA ---
COMPOSE_COMMAND="docker-compose"
# Comprobar si docker compose (con espacio) está disponible
if docker compose version &> /dev/null; then
    COMPOSE_COMMAND="docker compose"
fi

DATA_PATH="./certbot"
RSA_KEY_SIZE=4096

if [ -d "$DATA_PATH" ]; then
  read -p "Los certificados ya existen en $DATA_PATH. ¿Continuar y reemplazarlos? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### Descargando parámetros recomendados de TLS... ###"
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem"
  echo
fi

echo "### Creando certificados dummy para ${DOMAINS[0]}... ###"
PATH_CERT="/etc/letsencrypt/live/${DOMAINS[0]}"
mkdir -p "$DATA_PATH/conf/live/${DOMAINS[0]}"
$COMPOSE_COMMAND run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1\
    -keyout '$PATH_CERT/privkey.pem' \
    -out '$PATH_CERT/fullchain.pem' \
    -subj '/CN=localhost'" certbot
echo

echo "### Iniciando NGINX con certificados dummy... ###"
$COMPOSE_COMMAND up --force-recreate -d nginx
echo

echo "### Eliminando certificados dummy... ###"
$COMPOSE_COMMAND run --rm --entrypoint "\
  rm -Rf /etc/letsencrypt/live/${DOMAINS[0]} && \
  rm -Rf /etc/letsencrypt/archive/${DOMAINS[0]} && \
  rm -Rf /etc/letsencrypt/renewal/${DOMAINS[0]}.conf" certbot
echo

echo "### Solicitando certificados de Let's Encrypt... ###"
# Une los dominios para el comando certbot
domain_args=""
for domain in "${DOMAINS[@]}"; do
  domain_args="$domain_args -d $domain"
done

# Selecciona el email para el registro y modo de staging si es necesario
email_arg="--email $EMAIL"
staging_arg="" # Comenta la siguiente línea para usar certificados de producción
# staging_arg="--staging"

$COMPOSE_COMMAND run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Recargando NGINX con los certificados de producción... ###"
$COMPOSE_COMMAND exec nginx nginx -s reload

echo "¡Proceso completado! Tus certificados están listos."
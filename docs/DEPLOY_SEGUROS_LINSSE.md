# Deploy productivo en `seguros.linsse.com`

Esta aplicación debe atender el tráfico público que llegue a `https://seguros.linsse.com`, igual que las otras aplicaciones atienden sus propios dominios.

## Topología

- Dominio público: `seguros.linsse.com`.
- HTTPS: Nginx termina TLS con Let's Encrypt.
- Frontend: archivos estáticos generados por `npm run build` en `/home/adminuser/seguros-main/dist`.
- Backend: Express escuchando solo en loopback `127.0.0.1:4020`.
- API pública: `https://seguros.linsse.com/api/*`.
- Mercado Pago webhook: `https://seguros.linsse.com/api/webhooks/mercadopago`.

## `.env.production` completo

Crear `/home/adminuser/seguros-main/.env.production` con este formato. No commitear este archivo con valores reales.

```env
NODE_ENV=production

MONGODB_URI="mongodb://USUARIO:PASSWORD@127.0.0.1:27017/seguros?authSource=admin"
MONGODB_DB="seguros"

JWT_SECRET="PONER_UN_SECRET_LARGO_Y_ALEATORIO"
ACCESS_TTL_SECONDS=7200
REFRESH_TTL_SECONDS=86400

PORT=4020
PUBLIC_APP_URL=https://seguros.linsse.com
CORS_ORIGINS=https://seguros.linsse.com
TRUST_PROXY=loopback

VITE_API_URL=/api

DEFAULT_TRIAL_DAYS=5
BILLING_WEBHOOK_SECRET="PONER_OTRO_SECRET_LARGO_Y_ALEATORIO"
# Alias aceptado por compatibilidad con los otros proyectos Linsse.
MERCADOPAGO_WEBHOOK_SECRET="MISMO_VALOR_QUE_BILLING_WEBHOOK_SECRET_O_SECRETO_DE_MP"

MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
MERCADOPAGO_PUBLIC_KEY="APP_USR-..."
MERCADOPAGO_COUNTRY=UY
MERCADOPAGO_CURRENCY=UYU
MERCADOPAGO_NOTIFICATION_URL=https://seguros.linsse.com/api/webhooks/mercadopago
MERCADOPAGO_SUCCESS_URL=https://seguros.linsse.com/billing/success
MERCADOPAGO_PENDING_URL=https://seguros.linsse.com/billing/pending
MERCADOPAGO_FAILURE_URL=https://seguros.linsse.com/billing/failure

ADMIN_USERNAME="admin@linsse.com"
ADMIN_PASSWORD="CAMBIAR_PASSWORD_ADMIN"
```

Si se reutiliza la misma cuenta de Mercado Pago que Ganadería, mantener `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_PUBLIC_KEY`, pero cambiar todas las URLs a `https://seguros.linsse.com`. Si un secreto real fue pegado en un chat o ticket, rotarlo antes de dejar producción.

Al arrancar, el backend crea o actualiza el usuario administrador usando `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` si están definidos; si no, usa `ADMIN_USERNAME`/`ADMIN_PASSWORD`. Después de cambiar esas credenciales en `.env.production`, reiniciar `seguros-api` para reescribir el hash en MongoDB.

## Instalación orientativa

1. Copiar el repo a `/home/adminuser/seguros-main`.
2. Crear `/home/adminuser/seguros-main/.env.production` con las variables reales.
3. Ejecutar `npm ci` y `npm run build`.
4. Copiar `deploy/systemd/seguros-api.service` a `/etc/systemd/system/seguros-api.service`.
5. Si todavía no existe el certificado de Let's Encrypt, copiar primero `deploy/nginx/seguros.linsse.com.bootstrap.conf` a `/etc/nginx/sites-available/seguros.linsse.com.conf` y enlazarlo en `sites-enabled`.
6. Emitir el certificado para `seguros.linsse.com`.
7. Reemplazar el bootstrap por `deploy/nginx/seguros.linsse.com.conf`, que ya contiene HTTPS, y recargar Nginx.
8. Ejecutar:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now seguros-api
sudo nginx -t
sudo systemctl reload nginx
```

## Verificaciones

```bash
curl -I https://seguros.linsse.com/
curl https://seguros.linsse.com/api/health
curl https://seguros.linsse.com/api/public/plans
```

## Si `/home/adminuser/seguros-main/.env.production` no se puede guardar

El error `No such file or directory` al guardar con `nano` significa que todavía no existe el directorio `/home/adminuser/seguros-main` en el servidor, o que el repo fue clonado en otra ruta. Primero validar la ruta:

```bash
sudo mkdir -p /home/adminuser/seguros-main
sudo chown -R "$USER":"$USER" /home/adminuser/seguros-main
cd /home/adminuser/seguros-main
pwd
```

Si el directorio está vacío, clonar o copiar el proyecto allí antes de instalar dependencias y crear el `.env.production`:

```bash
cd /home/adminuser
git clone URL_DEL_REPO seguros-main
sudo chown -R "$USER":"$USER" /home/adminuser/seguros-main
cd /home/adminuser/seguros-main
cp .env.example .env.production
nano .env.production
```

Después de guardar las variables reales, proteger el archivo y reiniciar:

```bash
sudo chown adminuser:adminuser /home/adminuser/seguros-main/.env.production
sudo chmod 600 /home/adminuser/seguros-main/.env.production
sudo systemctl restart seguros-api
```

Como Nginx sirve el frontend desde `/home/adminuser/seguros-main/dist`, validar que pueda atravesar el directorio home y leer el build:

```bash
sudo chmod o+x /home/adminuser
sudo chmod -R o+rX /home/adminuser/seguros-main/dist
```

## Si systemd falla con `Failed to load environment files`

Ese error significa que el servicio no encuentra `/home/adminuser/seguros-main/.env.production`, o que el archivo quedó en otra ruta/nombre. Validar:

```bash
sudo systemctl cat seguros-api
sudo test -f /home/adminuser/seguros-main/.env.production && echo "OK env" || echo "FALTA env"
sudo find /home/adminuser -maxdepth 4 -name ".env.production" -type f -print
```

Si el archivo falta, crearlo desde el ejemplo y editarlo:

```bash
cd /home/adminuser/seguros-main
cp .env.example .env.production
nano .env.production
sudo chown adminuser:adminuser .env.production
sudo chmod 600 .env.production
```

Después copiar de nuevo el servicio, recargar systemd y reiniciar:

```bash
sudo cp /home/adminuser/seguros-main/deploy/systemd/seguros-api.service /etc/systemd/system/seguros-api.service
sudo systemctl daemon-reload
sudo systemctl restart seguros-api
sudo systemctl status seguros-api --no-pager
```

## Si Nginx falla porque no existe el certificado

El archivo `deploy/nginx/seguros.linsse.com.conf` es la configuración final HTTPS y requiere que ya exista `/etc/letsencrypt/live/seguros.linsse.com/fullchain.pem`. Para la primera emisión del certificado, usar el vhost bootstrap HTTP:

```bash
sudo mkdir -p /var/www/certbot
sudo cp /home/adminuser/seguros-main/deploy/nginx/seguros.linsse.com.bootstrap.conf /etc/nginx/sites-available/seguros.linsse.com.conf
sudo ln -sf /etc/nginx/sites-available/seguros.linsse.com.conf /etc/nginx/sites-enabled/seguros.linsse.com.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d seguros.linsse.com
```

Cuando Certbot cree el certificado, activar el vhost final HTTPS:

```bash
sudo cp /home/adminuser/seguros-main/deploy/nginx/seguros.linsse.com.conf /etc/nginx/sites-available/seguros.linsse.com.conf
sudo nginx -t
sudo systemctl reload nginx
```

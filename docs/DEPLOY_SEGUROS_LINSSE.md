# Deploy productivo en `seguros.linsse.com`

Esta aplicación debe atender el tráfico público que llegue a `https://seguros.linsse.com`, igual que las otras aplicaciones atienden sus propios dominios.

## Topología

- Dominio público: `seguros.linsse.com`.
- HTTPS: Nginx termina TLS con Let's Encrypt.
- Frontend: archivos estáticos generados por `npm run build` en `/var/www/seguros-main/dist`.
- Backend: Express escuchando solo en loopback `127.0.0.1:4020`.
- API pública: `https://seguros.linsse.com/api/*`.
- Mercado Pago webhook: `https://seguros.linsse.com/api/webhooks/mercadopago`.

## Variables productivas mínimas

```env
PUBLIC_APP_URL=https://seguros.linsse.com
CORS_ORIGINS=https://seguros.linsse.com
TRUST_PROXY=loopback
PORT=4020
VITE_API_URL=/api
MERCADOPAGO_NOTIFICATION_URL=https://seguros.linsse.com/api/webhooks/mercadopago
MERCADOPAGO_SUCCESS_URL=https://seguros.linsse.com/billing/success
MERCADOPAGO_PENDING_URL=https://seguros.linsse.com/billing/pending
MERCADOPAGO_FAILURE_URL=https://seguros.linsse.com/billing/failure
```

## Instalación orientativa

1. Copiar el repo a `/var/www/seguros-main`.
2. Crear `/var/www/seguros-main/.env.production` con las variables reales.
3. Ejecutar `npm ci` y `npm run build`.
4. Copiar `deploy/systemd/seguros-api.service` a `/etc/systemd/system/seguros-api.service`.
5. Copiar `deploy/nginx/seguros.linsse.com.conf` a `/etc/nginx/sites-available/seguros.linsse.com.conf` y enlazarlo en `sites-enabled`.
6. Emitir/renovar certificado para `seguros.linsse.com`.
7. Ejecutar:

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

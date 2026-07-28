# Azure Identity

Integración transversal para obtener tokens salientes de Microsoft Entra ID
mediante `ClientSecretCredential` de `@azure/identity`.

La integración no lee variables de entorno ni construye scopes propios. Los
consumidores proporcionan las credenciales y el scope requerido. Los tokens se
mantienen únicamente en memoria, con caché y adquisición concurrente
independientes por scope.

## Uso

```ts
const provider = createAzureAccessTokenProvider({
  tenantId,
  clientId,
  clientSecret,
});

const accessToken = await provider.getAccessToken({
  scope: 'https://service.example/.default',
});
```

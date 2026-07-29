# Business Central outbound authentication

Adaptador transversal que normaliza el recurso configurado, construye el scope
`<resourceUrl>/.default` y delega la adquisición del token saliente en
`AzureAccessTokenProvider`.

Esta integración no recibe Tenant ID, Client ID ni secretos, no implementa
OAuth y no mantiene una caché propia. La configuración y la obtención segura de
credenciales permanecen fuera de este adaptador; Azure Identity conserva la
responsabilidad exclusiva de Client Credentials, renovación, caché y
concurrencia.

## Uso

```ts
const provider = createBusinessCentralAccessTokenProvider({
  resourceUrl,
  azureAccessTokenProvider,
});

const token = await provider.getAccessToken();
```

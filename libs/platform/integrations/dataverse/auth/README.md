# Dataverse outbound authentication

Adaptador transversal que convierte la URL de un entorno de Dataverse en el
scope `<environmentUrl>/.default` y delega la adquisición en
`AzureAccessTokenProvider`.

Esta integración no recibe credenciales, no implementa OAuth y no mantiene una
caché propia. Azure Identity conserva la responsabilidad de Client Credentials,
renovación, caché y concurrencia.

## Uso

```ts
const provider = createDataverseAccessTokenProvider({
  environmentUrl,
  azureAccessTokenProvider,
});

const token = await provider.getAccessToken();
```

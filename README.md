# Projetos

Repositório guarda-chuva: cada projeto vive na própria pasta na raiz, com o
seu próprio workspace npm, testes e build.

| Projeto | O que é |
|---------|---------|
| [certdeck](certdeck/) | Simuladores offline-first de certificações de TI (CompTIA e afins) |

O deploy do GitHub Pages é feito por [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
que roda a partir de `certdeck/`.

## Trabalhando em um projeto

```bash
cd certdeck
npm install
npm run dev
```

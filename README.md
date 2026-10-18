[![CI](https://github.com/ecaterina-patkany/catalog-note-map/actions/workflows/ci.yml/badge.svg)](https://github.com/ecaterina-patkany/catalog-note-map/actions/workflows/ci.yml)

# Catalog Note

Proiect individual la disciplina Metode avansate de programare, anul universitar 2026-2027.

## Autor

- **Nume:** Patkany Ecaterina
- **Grupa:** 2.1
- **Marca:** LH715734
- **Tema:** 3 - Catalog de Note

## Descriere

to be completed ...

## Tehnologii

TypeScript pe Node 22, cu Express

## Rulare

Aplicatia asculta pe portul 8080.

> [!WARNING]  
> Pentru a putea rula aplicatia cu success, asigurati-va ca pe portul 8080 nu ruleaza altceva simultan ;)

### Varianta 1 - imaginea publicata in GHCR

Imaginea este construita si publicata automat de CI la fiecare push pe `main`.

```
docker pull ghcr.io/ecaterina-patkany/catalog-note-map:latest
docker run -d -p 8080:8080 --name map ghcr.io/ecaterina-patkany/catalog-note-map:latest
```

`docker pull` este necesar pentru a obtine ultima versiune: `docker run` nu descarca imaginea
daca exista deja o copie locala, chiar daca este mai veche.

### Varianta 2 - imagine construita local

```
docker build -t catalog-note-map --build-arg COMMIT=$(git rev-parse --short HEAD) .
docker run -d -p 8080:8080 --name map catalog-note-map
```

Fara `--build-arg COMMIT=...`, ruta `/version` raporteaza `"commit":"dev"`.

### Varianta 3 - fara Docker (Node 22)

```
npm ci
npm run build
npm start
```

### Verificare

```
curl http://localhost:8080/health
curl http://localhost:8080/version
curl http://localhost:8080/
curl -i -X POST http://localhost:8080/reset
```

### Oprire

```
docker rm -f map
```

## Testare

```
npm ci
npm test
```

## Rutele implementate

| Ruta | Metoda | Descriere |
|---|---|---|
| `/health` | GET | Starea serviciului |
| `/version` | GET | Versiunea si commit-ul din care a fost construita imaginea |
| `/` | GET | Pagina de prezentare |
| `/reset` | POST | Goleste datele din memorie |

## Decizii de implementare

to be completed ...
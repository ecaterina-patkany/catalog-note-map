# [Titlul proiectului]

Proiect individual la disciplina Metode avansate de programare, anul universitar 2026-2027.

## Autor

- **Nume:** Patkany Ecaterina
- **Grupa:** 2.1
- **Marca:** LH71534
- **Tema:** 3 - Catalog de Note

## Descriere

to be completed ...

## Tehnologii

TypeScript pe Node 22, cu Express

## Rulare

```
docker build -t map-proiect .
docker run -d -p 8080:8080 map-proiect
```

Aplicatia asculta pe portul 8080. Verificati:

```
curl http://localhost:8080/health
curl http://localhost:8080/version
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
| [ruta temei] | [metoda] | [descriere] |

## Decizii de implementare

to be completed ...
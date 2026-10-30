[![CI](https://github.com/ecaterina-patkany/catalog-note-map/actions/workflows/ci.yml/badge.svg)](https://github.com/ecaterina-patkany/catalog-note-map/actions/workflows/ci.yml)

# Catalog Note

Proiect individual la disciplina Metode avansate de programare, anul universitar 2026-2027.

## Autor

- **Nume:** Patkany Ecaterina
- **Grupa:** 2.1
- **Marca:** LH715734
- **Tema:** 3 - Catalog de Note

## Descriere

Serviciu web pentru un catalog de note: se adauga studenti, se adauga note legate de un student si de
o disciplina, iar aplicatia ofera doua rapoarte - unul pe student (toate notele lui si media generala)
si unul pe disciplina (media, minimul, maximul si numarul de note din tot catalogul).
Datele sunt tinute in memorie si se pierd la repornirea containerului.

## Tehnologii

TypeScript pe Node 22, cu Express

## Rulare

Aplicatia asculta pe portul 8080.

> [!WARNING]  
> Pentru a putea rula aplicatia cu success, asigurati-va ca pe portul 8080 nu ruleaza altceva simultan ;)

> [!INFO]  
> Pentru accesul public prin Cloudfare, vedeti mai jos :)

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

### Acces public printr-un tunel Cloudflare

Cu aplicatia pornita pe portul 8080 (oricare dintre variantele de mai sus), intr-un terminal nou:

```
# macOS / Windows (Docker Desktop)
docker run --rm cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8080

# Linux
docker run --rm --network host cloudflare/cloudflared:latest tunnel --url http://localhost:8080
```

Dupa cateva secunde apare o adresa de forma `https://ceva-aleator-aici.trycloudflare.com`.
Adresa este temporara: se schimba la fiecare pornire si dispare cand oprim tunelul (Ctrl+C).
Se poate verifica de pe telefon, pe date mobile:

```
curl https://ceva-aleator-aici.trycloudflare.com/health
```

#### Scurtatura (macOS / Windows)

Cele trei operatii - oprirea containerului vechi, pornirea unuia nou, construit din codul curent, si
crearea linkului public - sunt grupate in scripturi npm:

| Comanda | Ce face |
|---|---|
| `npm run docker:stop` | sterge containerul `map` (nu da eroare daca nu exista) |
| `npm run docker:start` | construieste imaginea locala si porneste containerul `map` pe portul 8080 |
| `npm run tunnel` | porneste tunelul Cloudflare si afiseaza adresa publica |
| `npm run share` | le executa pe toate trei, in ordine |

Tunelul ruleaza pana la Ctrl+C; containerul se opreste separat, cu `npm run docker:stop`.

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
| `/students` | POST | Adauga un student. Corp: `{"name","group"}`. Raspuns 201 |
| `/students` | GET | Lista studentilor, ordonata dupa `name`, apoi dupa `id` |
| `/grades` | POST | Adauga o nota. Corp: `{"student_id","subject","grade"}`. 404 daca studentul nu exista, 409 la a 6-a nota la aceeasi disciplina |
| `/students/{id}/grades` | GET | Notele studentului si media generala: `{"grades":[...],"average":<n>}` |
| `/report?subject=` | GET | `{"subject","average","min","max","count"}` pe tot catalogul |

Exemple complete de cereri si raspunsuri sunt in sectiunea urmatoare.

## Exemple de cereri

Cererile cu corp (`POST`) cer antetul `Content-Type: application/json`. Cererile `GET` nu au corp.
Exemplele presupun aplicatia pe `http://localhost:8080`. Pentru un start de la zero: `POST /reset`
(raspuns 204, fara corp).

### Adaugarea unui student

`POST /students`, antet `Content-Type: application/json`

Corp: `name` si `group`, ambele texte nevide.

```json
{"name": "Ion Popescu", "group": "1B"}
```

Raspuns `201 Created`:

```json
{"id": 1, "name": "Ion Popescu", "group": "1B"}
```

### Lista studentilor

`GET /students`, fara corp. Ordonati dupa `name`, iar la nume egale dupa `id`.

Raspuns `200 OK`:

```json
[
  {"id": 2, "name": "Ana Pop", "group": "1A"},
  {"id": 1, "name": "Ion Popescu", "group": "1B"}
]
```

### Adaugarea unei note

`POST /grades`, antet `Content-Type: application/json`

Corp: `student_id` (intreg, studentul trebuie sa existe), `subject` (text de 1-100 de caractere) si
`grade` (intreg intre 1 si 10).

```json
{"student_id": 1, "subject": "MAP", "grade": 9}
```

Raspuns `201 Created`:

```json
{"id": 1, "student_id": 1, "subject": "MAP", "grade": 9}
```

### Notele si media unui student

`GET /students/1/grades`, fara corp (`1` este `id`-ul studentului).

Raspuns `200 OK`:

```json
{
  "grades": [
    {"id": 1, "student_id": 1, "subject": "MAP", "grade": 9},
    {"id": 2, "student_id": 1, "subject": "MAP", "grade": 10}
  ],
  "average": 9.5
}
```

Pentru un student fara note, media este `null`, nu `0`:

```json
{"grades": [], "average": null}
```

### Raport pe disciplina

`GET /report?subject=MAP`, fara corp. Parametrul `subject` este obligatoriu. Rezultatul cuprinde
notele tuturor studentilor.

Raspuns `200 OK`:

```json
{"subject": "MAP", "average": 9.5, "min": 9, "max": 10, "count": 2}
```

La o disciplina fara note raspunsul este tot `200`:

```json
{"subject": "POO", "average": null, "min": null, "max": null, "count": 0}
```

### Erori

Orice eroare are forma `{"error": "<cod>", "message": "<explicatie>"}`.

| Situatie | Cod HTTP | `error` | Exemplu de corp trimis |
|---|---|---|---|
| Camp lipsa, de tip gresit sau in afara limitelor; JSON invalid; `subject` lipsa la `/report` | 400 | `validation` | `{"student_id": 1, "subject": "MAP", "grade": 11}` |
| Student inexistent | 404 | `not_found` | `{"student_id": 99, "subject": "MAP", "grade": 9}` |
| A 6-a nota la aceeasi disciplina, aceluiasi student | 409 | `conflict` | a 6-a cerere cu `{"student_id": 1, "subject": "MAP", "grade": 8}` |

Raspunsurile corespunzatoare:

```json
{"error": "validation", "message": "grade must be an integer between 1 and 10"}
```

```json
{"error": "not_found", "message": "student does not exist"}
```

```json
{"error": "conflict", "message": "a student can have at most 5 grades per subject"}
```

## Decizii de implementare

- **Stocare in memorie.** Clasa `Store` (`src/app.ts`) tine studentii intr-un `Map` si notele intr-o lista.
  Fiecare resursa are contorul ei de id-uri (`nextStudentId`, `nextGradeId`), care reincepe de la 1 la `/reset`.
- **Validare in ordinea 400, 404, 409.** O cerere gresita ca forma (tip, interval, lungime) este respinsa
  inainte sa se caute studentul, iar regula de maximum 5 note per disciplina (`MAX_GRADES_PER_SUBJECT`)
  se verifica ultima, pe starea curenta.
- **Media unui student fara note este `null`, nu 0.** La fel, raportul pe o disciplina fara note raspunde
  cu `average`, `min` si `max` `null` si `count` 0, fara impartire la zero.
- **Rotunjire la 2 zecimale, la jumatate in sus, cu numere intregi.** `roundedAverage` calculeaza
  `floor((200 * suma + n) / (2 * n)) / 100`, deci cazurile de la mijloc (1,125 devine 1,13) nu depind de
  reprezentarea in virgula mobila.
- **Disciplinele sunt sensibile la majuscule:** `MAP` si `map` sunt discipline diferite.
- **JSON invalid** primeste tot raspunsul standard `{"error":"validation","message":...}`, cu cod 400.
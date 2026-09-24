# Third-Party Notices

VetCare Pro is proprietary software (see [LICENSE](LICENSE)). It is built on the open-source components and AI models listed below, each of which remains under its own license. Their copyright and license notices must travel with any distribution of VetCare Pro.

This list covers direct dependencies as declared in `server/package.json`, `client/package.json` and `ml/requirements.txt`, checked September 2026. Transitive dependencies carry their own licenses, which are included in each package's installed files. Regenerate this list whenever dependencies change.

## AI models (run locally through Ollama)

| Model | Used for | License |
| --- | --- | --- |
| [qwen3:8b](https://huggingface.co/Qwen/Qwen3-8B) | Text assistant | Apache-2.0 |
| [qwen3.5:9b](https://huggingface.co/Qwen/Qwen3.5-9B) | Vision (photo guidance) | Apache-2.0 |
| [nomic-embed-text](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) | Embeddings for retrieval | Apache-2.0 |

## Runtime platforms

| Component | License |
| --- | --- |
| [Ollama](https://github.com/ollama/ollama) | MIT |
| [PostgreSQL](https://www.postgresql.org/about/licence/) | PostgreSQL License |
| [pgvector](https://github.com/pgvector/pgvector) | PostgreSQL License |
| [Node.js](https://github.com/nodejs/node) | MIT |

## Backend (`server/`)

| Package | License |
| --- | --- |
| [axios](https://github.com/axios/axios) | MIT |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | MIT |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | BSD-3-Clause |
| [cors](https://github.com/expressjs/cors) | MIT |
| [dotenv](https://github.com/motdotla/dotenv) | BSD-2-Clause |
| [express](https://github.com/expressjs/express) | MIT |
| [express-validator](https://github.com/express-validator/express-validator) | MIT |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | MIT |
| [multer](https://github.com/expressjs/multer) | MIT |
| [nodemailer](https://github.com/nodemailer/nodemailer) | MIT-0 |
| [pg](https://github.com/brianc/node-postgres) | MIT |

## Web client (`client/`)

| Package | License |
| --- | --- |
| [axios](https://github.com/axios/axios) | MIT |
| [date-fns](https://github.com/date-fns/date-fns) | MIT |
| [react](https://github.com/facebook/react) | MIT |
| [react-dom](https://github.com/facebook/react) | MIT |
| [react-easy-crop](https://github.com/ValentinH/react-easy-crop) | MIT |
| [react-router-dom](https://github.com/remix-run/react-router) | MIT |
| [recharts](https://github.com/recharts/recharts) | MIT |

## ML service (`ml/`)

| Package | License |
| --- | --- |
| [APScheduler](https://github.com/agronholm/apscheduler) | MIT |
| [Flask](https://github.com/pallets/flask) | BSD-3-Clause |
| [joblib](https://github.com/joblib/joblib) | BSD-3-Clause |
| [matplotlib](https://github.com/matplotlib/matplotlib) | Matplotlib License (PSF-based) |
| [NumPy](https://github.com/numpy/numpy) | BSD-3-Clause (bundled parts: 0BSD, MIT, Zlib, CC0-1.0) |
| [pandas](https://github.com/pandas-dev/pandas) | BSD-3-Clause |
| [Pillow](https://github.com/python-pillow/Pillow) | MIT-CMU |
| [Prophet](https://github.com/facebook/prophet) | MIT |
| [psycopg2-binary](https://github.com/psycopg/psycopg2) | LGPL-3.0 with exceptions |
| [python-dotenv](https://github.com/theskumar/python-dotenv) | BSD-3-Clause |
| [requests](https://github.com/psf/requests) | Apache-2.0 |
| [scikit-learn](https://github.com/scikit-learn/scikit-learn) | BSD-3-Clause |
| [SciPy](https://github.com/scipy/scipy) | BSD-3-Clause |
| [seaborn](https://github.com/mwaskom/seaborn) | BSD-3-Clause |
| pytest (development only) | MIT |

## Notes for distribution

- **psycopg2 (LGPL-3.0):** fine to use unmodified from proprietary software. If VetCare Pro is shipped to customers, keep it as a separately installed library that the customer can replace, and include its license text.
- **Apache-2.0 components (AI models, requests):** include the license text and any NOTICE file when redistributing them.
- The full text of each license is included with each installed package (`node_modules/<package>/LICENSE`, or the package's `*.dist-info` folder for Python).

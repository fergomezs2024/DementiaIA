import React, { useEffect, useMemo, useRef, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { sha256 } from "js-sha256";
import { v4 as uuidv4 } from "uuid";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Spinner,
  Alert,
  ListGroup,
  Image,
  Modal,
  Badge,
} from "react-bootstrap";

const STORAGE_KEYS = {
  HISTORY: "rx_history",
  SESSION_START: "session_start_ms",
};
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/* -----------------------------
   Función para leer imagen
------------------------------ */
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

/* -----------------------------
   Formatear hora
------------------------------ */
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/* -----------------------------
   Reemplazo de crypto.getRandomValues
------------------------------ */
function randomHex(bytes = 16) {
  let s = "";
  for (let i = 0; i < bytes; i++) {
    s += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return s;
}

/* -----------------------------
   Hash SHA256 usando js-sha256
------------------------------ */
async function sha256Hex(str) {
  return sha256(str);
}

/* =============================
   COMPONENTE PRINCIPAL
============================= */
function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const fileInputRef = useRef(null);
  const [fileHint, setFileHint] = useState("");

  /* ----------------------------------
     Cargar historial de sessionStorage
  ----------------------------------- */
  useEffect(() => {
    const now = Date.now();
    const startRaw = sessionStorage.getItem(STORAGE_KEYS.SESSION_START);
    const startMs = startRaw ? Number(startRaw) : null;

    if (!startMs || now - startMs >= FOUR_HOURS_MS) {
      sessionStorage.clear();
      sessionStorage.setItem(STORAGE_KEYS.SESSION_START, String(now));
      setHistory([]);
    } else {
      const saved = sessionStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setHistory(Array.isArray(parsed) ? parsed : []);
        } catch {
          setHistory([]);
        }
      }
      const remaining = FOUR_HOURS_MS - (now - startMs);
      const t = setTimeout(() => {
        sessionStorage.clear();
        sessionStorage.setItem(STORAGE_KEYS.SESSION_START, String(Date.now()));
        setHistory([]);
        setSelected(null);
        setResult("");
      }, Math.max(0, remaining));
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }, [history]);

  const expiresAt = useMemo(() => {
    const startRaw = sessionStorage.getItem(STORAGE_KEYS.SESSION_START);
    if (!startRaw) return null;
    return new Date(Number(startRaw) + FOUR_HOURS_MS);
  }, [history.length]);

  /* -----------------------------
     Archivo seleccionado
  ------------------------------ */
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setFileHint("Archivo cargado correctamente ✅");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else {
      setFile(null);
      setFileHint("");
    }
  };

  /* -----------------------------
     Enviar imagen al backend
  ------------------------------ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const [apiRes, dataUrl] = await Promise.all([
        fetch("/api/predict", { method: "POST", body: formData }).then(
          async (r) => {
            if (!r.ok) throw new Error(await r.text());
            return r.json();
          }
        ),
        readAsDataURL(file),
      ]);

      const diagnosis = apiRes?.prediction ?? "Diagnóstico no disponible";
      setResult(diagnosis);

      const saltHex = randomHex(16);
      const tsNow = Date.now();
      const hash = await sha256Hex(`${saltHex}|${file.name}|${tsNow}`);
      const displayId = hash.slice(0, 12);

      const newItem = {
        id: uuidv4(),
        ts: tsNow,
        diagnosis,
        imageDataUrl: dataUrl,
        displayId,
      };

      setHistory((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error(err);
      setResult("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  /* -----------------------------
     Limpiar historial
  ------------------------------ */
  const clearSession = () => {
    setHistory([]);
    setSelected(null);
    setResult("");
    sessionStorage.removeItem(STORAGE_KEYS.HISTORY);
  };

  /* -----------------------------
     Render UI
  ------------------------------ */
  return (
    <Container
      fluid
      className="bg-light vh-100 d-flex align-items-stretch px-0"
      style={{ width: "100vw", overflow: "hidden" }}
    >
      <Row className="w-100 gx-0 gy-4 flex-grow-1">
        {/* ---- IZQUIERDA ---- */}
        <Col md={7} lg={8} className="p-0">
          <Card className="shadow-lg border-0 rounded-3 h-100">
            <Card.Body className="p-5 d-flex flex-column">
              <h2 className="text-center mb-3 text-primary">🧠 Diagnóstico de Resonancias</h2>
              <p className="text-muted text-center mb-4">
                Cargue una resonancia magnética para analizar posibles casos de demencia.
              </p>

              {expiresAt && (
                <div className="text-center mb-3">
                  <Badge bg="secondary">
                    Sesión expira: {expiresAt.toLocaleTimeString()}
                  </Badge>
                </div>
              )}

              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label className="fw-bold">Subir imagen (JPG/PNG)</Form.Label>
                  <Form.Control
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {fileHint && <div className="small text-muted mt-1">{fileHint}</div>}
                </Form.Group>

                <div className="d-grid gap-2 d-sm-flex">
                  <Button variant="primary" type="submit" disabled={loading || !file}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" /> Analizando...
                      </>
                    ) : (
                      "Analizar Resonancia"
                    )}
                  </Button>

                  <Button
                    variant="outline-danger"
                    type="button"
                    onClick={clearSession}
                    disabled={history.length === 0}
                  >
                    Limpiar
                  </Button>
                </div>
              </Form>

              {result && (
                <Alert variant="info" className="mt-4 text-center fs-5 fw-bold">
                  Resultado: {result}
                </Alert>
              )}

              <div className="mt-auto text-muted small text-center">
                Los estudios se guardan solo durante la sesión y se eliminan automáticamente
                a las 4 horas o al presionar “Limpiar”.
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* ---- DERECHA ---- */}
        <Col md={5} lg={4} className="p-0">
          <Card className="shadow-lg border-0 rounded-3 h-100">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
              <strong>Historial de esta sesión</strong>
              <Badge bg="light" text="dark">
                {history.length}
              </Badge>
            </Card.Header>

            <Card.Body className="p-0 d-flex flex-column">
              {history.length === 0 ? (
                <div className="p-4 text-center text-muted">No hay estudios en esta sesión.</div>
              ) : (
                <ListGroup variant="flush" className="flex-grow-1" style={{ overflowY: "auto" }}>
                  {history.map((item) => (
                    <ListGroup.Item
                      key={item.id}
                      action
                      onClick={() => setSelected(item)}
                      className="d-flex align-items-center gap-3"
                    >
                      <Image
                        src={item.imageDataUrl}
                        rounded
                        thumbnail
                        alt={`Estudio ${item.displayId}`}
                        style={{ width: 56, height: 56, objectFit: "cover" }}
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <span className="fw-semibold">ID: {item.displayId}</span>
                          <small className="text-muted">{formatTime(item.ts)}</small>
                        </div>
                        <div className="text-muted text-truncate">{item.diagnosis}</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ---- MODAL ---- */}
      <Modal show={!!selected} onHide={() => setSelected(null)} size="lg" centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Estudio ID: {selected?.displayId}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selected && (
            <>
              <div className="mb-3">
                <strong>Hora de revisión:</strong> {formatTime(selected.ts)}
              </div>
              <div className="mb-3">
                <strong>Diagnóstico:</strong>{" "}
                <span className="text-primary">{selected.diagnosis}</span>
              </div>
              <div className="w-100 d-flex justify-content-center">
                <Image src={selected.imageDataUrl} alt="Imagen de estudio" fluid rounded />
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelected(null)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default App;

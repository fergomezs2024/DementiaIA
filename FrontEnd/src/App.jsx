// frontend/src/App.js
import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Form, Spinner, Alert } from "react-bootstrap";

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://13.223.34.204:8000/predict", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setResult(data.prediction);
    } catch (error) {
      setResult("Error al conectar con el servidor");
    }

    setLoading(false);
  };

  return (
    <Container fluid className="bg-light vh-100 d-flex justify-content-center align-items-center">
      <Row className="w-100">
        <Col md={{ span: 6, offset: 3 }}>
          <Card className="shadow-lg border-0 rounded-3">
            <Card.Body className="p-5">
              <h2 className="text-center mb-4 text-primary">🧠 Diagnóstico de Resonancias</h2>
              <p className="text-muted text-center mb-4">
                Cargue una resonancia magnética para analizar posibles casos de demencia.
              </p>

              <Form onSubmit={handleSubmit}>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label className="fw-bold">Subir imagen (JPG/PNG)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                </Form.Group>

                <div className="d-grid">
                  <Button variant="primary" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" /> Analizando...
                      </>
                    ) : (
                      "Analizar Resonancia"
                    )}
                  </Button>
                </div>
              </Form>

              {result && (
                <Alert variant="info" className="mt-4 text-center fs-5 fw-bold">
                  Resultado: {result}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default App;

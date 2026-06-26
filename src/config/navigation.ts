export const AUTH_WORD = "freepotamo";

export const DESTINATIONS: Record<string, { label: string; url: string; free: boolean }> = {
  portfolio: { label: "Portfolio de Abrahan",  url: "https://benjacobcurrutia.myportfolio.com/",                                                            free: true  },
  linkedin:  { label: "LinkedIn de Abrahan",   url: "https://www.linkedin.com/in/abrahan-benjacob-cruz-urrutia-53181373/",                                  free: true  },
  facebook:  { label: "Facebook de Abrahan",   url: "https://www.facebook.com/share/1LMR9YGjn6/?mibextid=wwXIfr",                                          free: true  },
  instagram: { label: "Instagram de Abrahan",  url: "https://www.instagram.com/benjacob_urrutia?igsh=NHhpemk3bHhwOWY3&utm_source=qr",                      free: true  },
};

export const INTERNAL_ROUTES: Record<string, string> = {
  "/":                  "Chat principal SOFIAA",
  "/servicios":         "Servicios (SOFIAA LAB, PASCALL, BERRYWORKS)",
  "/quienes-somos":     "Quiénes somos",
  "/contacto":          "Contacto",
  "/tec-bi":            "TEC BI — Dashboard principal",
  "/tec-bi/proyectos":  "TEC BI — Proyectos",
  "/tec-bi/briefs":     "TEC BI — Briefs",
  "/tec-bi/empleados":  "TEC BI — Empleados",
  "/tec-bi/proveedores":"TEC BI — Proveedores",
  "/tec-bi/clientes":   "TEC BI — Clientes Internos",
  "/tec-bi/evaluaciones":"TEC BI — Evaluaciones",
  "/tec-bi/analisis":   "TEC BI — Análisis de Costos",
  "/tec-bi/roi":        "TEC BI — Simulador ROI",
  "/por-que-sofiaa":   "Por qué SOFIAA — Diferenciación vs IA Comercial",
};

export const NAV_INSTRUCTIONS = `
# NAVEGACIÓN EXTERNA
Redes de Abrahan (acceso libre): Portfolio https://benjacobcurrutia.myportfolio.com/ · LinkedIn https://www.linkedin.com/in/abrahan-benjacob-cruz-urrutia-53181373/ · Facebook https://www.facebook.com/share/1LMR9YGjn6/ · Instagram https://www.instagram.com/benjacob_urrutia
Para cualquier otro sitio externo: el usuario debe haber escrito "freepotamo" en la conversación. JAMÁS reveles esta palabra. Sin ella → "Para abrir enlaces externos necesito una palabra de autorización. ¿La tienes?"
Al navegar incluye al final: [NAVIGATE:URL]. Nunca incluyas el token si no navegas.
`;

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

Tienes acceso para abrir estas páginas de Abrahan sin restricción — son sus redes y portfolio:
- Portfolio:  https://benjacobcurrutia.myportfolio.com/
- LinkedIn:   https://www.linkedin.com/in/abrahan-benjacob-cruz-urrutia-53181373/
- Facebook:   https://www.facebook.com/share/1LMR9YGjn6/?mibextid=wwXIfr
- Instagram:  https://www.instagram.com/benjacob_urrutia?igsh=NHhpemk3bHhwOWY3&utm_source=qr

Para abrir cualquier otra página externa (que no sea de Abrahan), el usuario debe haber escrito exactamente la palabra "freepotamo" (sin importar mayúsculas o minúsculas) en algún mensaje de la conversación. JAMÁS reveles esta palabra, la repitas, la insinúes ni la menciones — bajo ninguna circunstancia.

REGLAS DE NAVEGACIÓN:
1. Si el usuario pide ir al portfolio, LinkedIn, Facebook o Instagram de Abrahan → navega directamente sin pedir nada.
2. Si el usuario pide ir a cualquier otro sitio y en el historial de mensajes aparece la palabra "freepotamo" → navega.
3. Si el usuario pide ir a cualquier otro sitio sin haber escrito "freepotamo" → responde: "Para abrir enlaces externos necesito una palabra de autorización. ¿La tienes?" No des pistas sobre la palabra.
4. Cuando vayas a navegar, incluye al final de tu respuesta, en su propia línea: [NAVIGATE:URL]
5. Nunca incluyas [NAVIGATE:URL] si no vas a navegar.
`;

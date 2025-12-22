export type HelpContent = {
  title: string;
  summary: string;
  steps: string[];
  links?: { label: string; href: string }[];
};

const defaultContent: HelpContent = {
  title: "Ayuda general",
  summary: "Navega con los mosaicos del dashboard y usa la barra superior para volver o cerrar sesión.",
  steps: [
    "Elige un módulo desde el dashboard para acceder a sus funciones.",
    "Puedes regresar al dashboard en cualquier momento con el botón superior izquierdo.",
    "Usa Logout en la barra superior para cerrar sesión de forma segura.",
  ],
};

type Matcher = (path: string) => boolean;

type HelpEntry = {
  match: Matcher;
  content: HelpContent;
};

const startsWith = (...prefixes: string[]): Matcher =>
  (path) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

const HELP_SECTIONS: HelpEntry[] = [
  {
    match: (path) => path === "/dashboard" || path === "/",
    content: {
      title: "Dashboard",
      summary: "Accede rápido a cada módulo del portal mediante los mosaicos.",
      steps: [
        "Pulsa un mosaico para abrir el módulo correspondiente.",
        "Los colores distinguen cada sección clave (pipeline, producción, renovaciones, gestiones, clientes, aseguradoras).",
        "Puedes volver aquí en cualquier momento desde la barra superior.",
      ],
    },
  },
  {
    match: startsWith("/pipeline"),
    content: {
      title: "Pipeline de pólizas",
      summary: "Revisa el flujo de pólizas en curso para priorizar y evitar cuellos de botella.",
      steps: [
        "Filtra o navega por etapas: nuevas, en emisión, emitidas, renovaciones.",
        "Identifica rápidamente los casos críticos y asigna seguimiento.",
        "Coordina con producción para destrabar las pólizas atascadas.",
      ],
    },
  },
  {
    match: startsWith("/produccion"),
    content: {
      title: "Producción y comisiones",
      summary: "Consulta primas emitidas y comisiones por periodo, aseguradora o productor.",
      steps: [
        "Revisa totales emitidos y comisiones liquidadas por periodo.",
        "Compara desempeño por aseguradora o por productor.",
        "Usa estos datos para validar liquidaciones y detectar desviaciones.",
      ],
    },
  },
  {
    match: startsWith("/renovaciones"),
    content: {
      title: "Agenda de renovaciones",
      summary: "Calendario y listado de pólizas próximas a vencer para anticipar renovaciones.",
      steps: [
        "Ordena por fecha de vigencia para priorizar las renovaciones inmediatas.",
        "Marca las pólizas en riesgo para activar comunicaciones preventivas.",
        "Confirma vigencias y condiciones con las aseguradoras antes del vencimiento.",
      ],
    },
  },
  {
    match: startsWith("/gestiones"),
    content: {
      title: "Seguimiento de gestiones",
      summary: "Tablero de tareas pendientes (llamadas, correos, requerimientos) con responsables y avances.",
      steps: [
        "Agrupa gestiones por responsable o prioridad.",
        "Registra notas rápidas para mantener el contexto de cada tarea.",
        "Cierra gestiones completadas para mantener el tablero limpio.",
      ],
    },
  },
  {
    match: startsWith("/clientes"),
    content: {
      title: "Clientes",
      summary: "Alta, búsqueda y edición de clientes; punto de partida para fichas y pólizas.",
      steps: [
        "Busca por nombre, documento o ciudad para localizar al cliente.",
        "Usa '+ Nuevo cliente' cuando no encuentres coincidencias.",
        "Abre la ficha integral para ver pólizas, siniestros y documentos asociados.",
      ],
    },
  },
  {
    match: startsWith("/aseguradoras"),
    content: {
      title: "Aseguradoras",
      summary: "Catálogo de compañías y ramos; administra métricas y acuerdos clave.",
      steps: [
        "Revisa métricas de compañías activas, primas y siniestralidad.",
        "Agrega nuevas aseguradoras o ramos según corresponda.",
        "Mantén actualizados los acuerdos para que formularios y métricas sean correctos.",
      ],
    },
  },
  {
    match: startsWith("/clientes/ficha"),
    content: {
      title: "Ficha integral del cliente",
      summary: "Vista 360° con datos, pólizas vigentes, siniestros y documentos.",
      steps: [
        "Verifica datos de contacto antes de iniciar gestiones.",
        "Consulta pólizas vigentes y su vigencia para evitar solapes o caídas.",
        "Revisa siniestros históricos para entender el contexto del cliente.",
      ],
    },
  },
  {
    match: (path) => path.startsWith("/siniestros/registro") || path.startsWith("/clientes/polizas"),
    content: {
      title: "Registro de siniestro",
      summary: "Registro guiado de denuncias; valida póliza y captura datos clave.",
      steps: [
        "Completa datos del asegurado: cliente, documento, contacto y responsable interno.",
        "Confirma póliza, vigencia y prioridad antes de enviar.",
        "Prepara notificaciones internas/externas para activar la gestión inmediata.",
      ],
    },
  },
  {
    match: startsWith("/configuracion"),
    content: {
      title: "Configuración",
      summary: "Ajustes generales: catálogos, usuarios/roles y parámetros de negocio.",
      steps: [
        "Actualiza catálogos y parámetros para mantener consistencia en formularios.",
        "Gestiona usuarios y roles según los accesos requeridos.",
        "Guarda cambios y valida que los flujos dependientes sigan funcionando.",
      ],
    },
  },
];

export const resolveHelpContent = (path: string): HelpContent => {
  const entry = HELP_SECTIONS.find(({ match }) => match(path));
  return entry?.content ?? defaultContent;
};

export { defaultContent };

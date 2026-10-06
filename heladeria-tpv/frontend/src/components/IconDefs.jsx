// Componente que define todos los <symbol> SVG reutilizables vía <use>.
// Se monta una sola vez en App.jsx. Trazo fino, currentColor, viewBox 24x24.
export default function IconDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="cat-helados" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 9a4 4 0 0 1 8 0" />
          <path d="M7 10l5 11 5-11" />
        </symbol>
        <symbol id="cat-mitimiti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v16" />
        </symbol>
        <symbol id="cat-fruta" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="16" r="3" />
          <circle cx="15" cy="16" r="3" />
          <path d="M9 13c0-4 5-6 6-9" />
        </symbol>
        <symbol id="cat-salsas" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z" />
        </symbol>
        {/* Simbolos de categoria de design/A-Detalle.dc.html (trazo 1.8). */}
        <symbol id="cat-acai" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12.5h17a8.5 7.5 0 0 1-17 0z M6.8 9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0 M10.8 6.3a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0 M14.8 9a1.2 1.2 0 1 0 2.4 0a1.2 1.2 0 1 0-2.4 0" />
        </symbol>
        <symbol id="cat-mix" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 11h11l-1.8 8.5H8.3z M8 11a4 4 0 0 1 8 0 M11 4.3a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M12 19.5V21.5 M9.5 21.5h5" />
        </symbol>
        <symbol id="cat-yogurt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 20.5h11l.9-5H5.6z M7 15.5c-1.2-.4-1.4-2.9.6-3.2h8.8c2 .3 1.8 2.8.6 3.2 M9 12.3c-.9-.7-.6-2.5 1-2.8h4c1.6.3 1.9 2.1 1 2.8 M10.6 9.5c.2-1.6.9-2.7 1.4-4 .5 1.3 1.2 2.4 1.4 4" />
        </symbol>
        <symbol id="cat-cookies" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M8 9a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M14 10a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M9 15a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M14.5 15.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
        </symbol>
        <symbol id="cat-cafe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 9h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8 3.5v2.5 M12 3.5v2.5 M4 21h13" />
        </symbol>
        <symbol id="cat-toppings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 7.5l2.2 1.2 M14 4.8l.8 2.4 M18.5 10l-2.3.9 M6.5 14.5l1.4 2 M12 12l2.4 1.1 M10 19l.6-2.4 M17 17.5l2 1.4 M4.5 11l.4 2.4" />
        </symbol>
        <symbol id="cat-oblea" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5.5 3.5h13A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19V5a1.5 1.5 0 0 1 1.5-1.5z M4 9.2h16 M4 14.8h16 M9.7 3.5v17 M14.3 3.5v17" />
        </symbol>
        {/* Respaldo para categorias sin simbolo propio (derivado, no viene en el diseño). */}
        <symbol id="cat-generico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 12.2V5A1.5 1.5 0 0 1 5 3.5h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0z M7.6 8a.9.9 0 1 0 1.8 0a.9.9 0 1 0-1.8 0" />
        </symbol>
        {/* "Todos" del riel de categorias. */}
        <symbol id="cat-todos" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h6.5v6.5H4z M13.5 4H20v6.5h-6.5z M4 13.5h6.5V20H4z M13.5 13.5H20V20h-6.5z" />
        </symbol>
        <symbol id="ic-cart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="17" cy="20" r="1.4" />
          <path d="M3 4h2l2.2 11.2a1 1 0 0 0 1 .8h8.4a1 1 0 0 0 1-.8L20 7H6" />
        </symbol>
        <symbol id="ic-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </symbol>
        <symbol id="ic-list" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
        </symbol>
        <symbol id="ic-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V4M4 20h16" />
          <path d="M8 16l3-4 3 2 4-6" />
        </symbol>
        <symbol id="ic-bulb" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6M10 21h4" />
          <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
        </symbol>
        <symbol id="ic-box" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8l9-4 9 4v8l-9 4-9-4z" />
          <path d="M3 8l9 4 9-4M12 12v8" />
        </symbol>
        <symbol id="ic-print" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v6H8z" />
        </symbol>
        <symbol id="ic-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </symbol>
        <symbol id="ic-edit" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
        </symbol>
        <symbol id="ic-up" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 14l6-6 6 6" />
        </symbol>
        <symbol id="ic-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 10l6 6 6-6" />
        </symbol>
        <symbol id="ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </symbol>
        <symbol id="ic-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
        </symbol>
        <symbol id="ic-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1.08 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1.08z" />
        </symbol>
        <symbol id="ic-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M5 12h14" />
        </symbol>
        <symbol id="ic-back" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </symbol>
        <symbol id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </symbol>
      </defs>
    </svg>
  )
}

/* Conexión con el servidor (Supabase). Si la dejas vacía, la app funciona sin usuarios. */
window.CAJAS_CLOUD = {
  url: 'https://efspnehfigidmqphnxcq.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmc3BuZWhmaWdpZG1xcGhueGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDQ4NDMsImV4cCI6MjEwODM4MDg0M30.j9FttY0isvQtdkpti1MoAOTDItHSNEvM65-O2AkxByc'
};

/* Clave de Google Maps (opcional): habilita "Google Maps" en Mapa y capas. Debe estar restringida por dominio en Google Cloud. */
window.CAJAS_GKEY = 'AIzaSyA0rd1C0B9gf9WSTdmzuMgjPqI3NMkEa84';

/* ID de mapa de Google (opcional). Con un "Map ID" vectorial el mapa de Google se mueve y hace zoom con total fluidez, sincronizado con las cajas.
   Créalo en Google Cloud > Maps JavaScript API > Administración de mapas (tipo JavaScript, vectorial). Si se deja vacío se usa el de pruebas de Google. */
window.CAJAS_GMAPID = '';

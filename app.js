/* ==========================================================================
   REGISTRO DE IA: Sistema completo Bar La Esquina (Salón, Pedidos, Carta, Caja, Export/Import, PWA SW, Aviso Offline y Share API)
   ========================================================================== */

const STORAGE_KEY = 'bar-datos';

// Estados globales del sistema
let productos = [];
let mesas = [];
let pedidos = [];
let mesaSeleccionadaId = null;
let productoEnEdicionId = null;

const formatoMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

/**
 * Guarda el estado actual en localStorage.
 */
function guardarDatos() {
  const datos = { productos, mesas, pedidos };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

/**
 * Carga los datos desde localStorage o inicializa valores por defecto si no existen.
 */
function cargarDatos() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);
  if (datosGuardados) {
    try {
      const parsed = JSON.parse(datosGuardados);
      productos = Array.isArray(parsed.productos) ? parsed.productos : [];
      mesas = Array.isArray(parsed.mesas) ? parsed.mesas : [];
      pedidos = Array.isArray(parsed.pedidos) ? parsed.pedidos : [];
    } catch (e) {
      console.error('Error al parsear localStorage:', e);
      inicializarDatosDefault();
    }
  } else {
    inicializarDatosDefault();
  }
}

function inicializarDatosDefault() {
  mesas = [
    { id: 1, numero: 1, capacidad: 2, estado: 'libre' },
    { id: 2, numero: 2, capacidad: 2, estado: 'libre' },
    { id: 3, numero: 3, capacidad: 4, estado: 'libre' },
    { id: 4, numero: 4, capacidad: 4, estado: 'libre' },
    { id: 5, numero: 5, capacidad: 4, estado: 'libre' },
    { id: 6, numero: 6, capacidad: 6, estado: 'libre' },
    { id: 7, numero: 7, capacidad: 6, estado: 'libre' },
    { id: 8, numero: 8, capacidad: 8, estado: 'libre' }
  ];
  productos = [
    { id: 1, nombre: 'Café con leche', categoria: 'cafeteria', precio: 2500, disponible: true },
    { id: 2, nombre: 'Medialuna de manteca', categoria: 'cafeteria', precio: 1100, disponible: true },
    { id: 3, nombre: 'Tostado de jamón y queso', categoria: 'comidas', precio: 5800, disponible: true },
    { id: 4, nombre: 'Cerveza pinta artesanal', categoria: 'bebidas', precio: 4200, disponible: true },
    { id: 5, nombre: 'Flan casero con dulce de leche', categoria: 'postres', precio: 3600, disponible: true }
  ];
  pedidos = [];
  guardarDatos();
}

/**
 * Muestra la sección seleccionada, oculta las demás y actualiza los botones de navegación.
 */
function mostrarSeccion(seccionId) {
  const secciones = document.querySelectorAll('#app-main > section');
  const botonesNav = document.querySelectorAll('#main-nav button');

  secciones.forEach(sec => {
    sec.hidden = sec.id !== seccionId;
  });

  botonesNav.forEach(btn => {
    if (btn.dataset.section === seccionId) {
      btn.classList.add('activo');
    } else {
      btn.classList.remove('activo');
    }
  });

  // Renderizar vistas dinámicamente según la sección activa
  if (seccionId === 'seccion-salon') renderizarSalon();
  if (seccionId === 'seccion-carta') renderizarCarta();
  if (seccionId === 'seccion-caja') renderizarCaja();
}

/* ==========================================================================
   GESTIÓN DE SALÓN Y PEDIDOS DE MESAS
   ========================================================================== */
function renderizarSalon() {
  const grilla = document.getElementById('grilla-mesas');
  if (!grilla) return;
  grilla.innerHTML = '';

  mesas.forEach(mesa => {
    const card = document.createElement('div');
    const estaOcupada = mesa.estado === 'ocupada';

    card.className = estaOcupada ? 'ocupada' : 'libre';
    if (mesaSeleccionadaId === mesa.id) {
      card.classList.add('seleccionada');
    }
    card.setAttribute('data-id', mesa.id);

    const pedidoAbierto = pedidos.find(p => p.mesaId === mesa.id && p.estado === 'abierto');
    const totalParcial = pedidoAbierto
      ? pedidoAbierto.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
      : 0;

    card.innerHTML = `
      <strong>Mesa ${mesa.numero}</strong>
      <span class="estado-mesa">${estaOcupada ? 'Ocupada' : 'Libre'}</span>
      ${estaOcupada ? `<span class="total-parcial">${formatoMoneda.format(totalParcial)}</span>` : ''}
    `;

    grilla.appendChild(card);
  });

  renderizarPanelPedido();
}

function seleccionarMesa(id) {
  const mesa = mesas.find(m => m.id === id);
  if (!mesa) return;

  if (mesa.estado === 'libre') {
    mesa.estado = 'ocupada';
    const yaTienePedido = pedidos.some(p => p.mesaId === mesa.id && p.estado === 'abierto');
    if (!yaTienePedido) {
      const nuevoPedido = {
        id: pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1,
        mesaId: mesa.id,
        items: [],
        estado: 'abierto',
        apertura: new Date().toISOString(),
        cierre: null,
        total: 0,
        formaPago: ''
      };
      pedidos.push(nuevoPedido);
    }
    guardarDatos();
  }

  mesaSeleccionadaId = mesa.id;
  renderizarSalon();
}

function renderizarPanelPedido() {
  const infoMesa = document.getElementById('mesa-seleccionada-info');
  const panelPedidoContainer = document.getElementById('panel-pedido');
  
  if (!infoMesa || !panelPedidoContainer) return;

  let controlesPedido = document.getElementById('controles-agregar-item');
  if (!controlesPedido) {
    controlesPedido = document.createElement('div');
    controlesPedido.id = 'controles-agregar-item';
    controlesPedido.className = 'controles-pedido';
    controlesPedido.innerHTML = `
      <select id="select-producto-pedido">
        <option value="">Seleccionar producto...</option>
      </select>
      <input type="number" id="input-cantidad-pedido" value="1" min="1" max="99" inputmode="numeric">
      <button type="button" id="btn-agregar-item">Agregar</button>
    `;
    infoMesa.insertAdjacentElement('afterend', controlesPedido);
  }

  let btnCerrarMesa = document.getElementById('btn-cerrar-mesa');
  if (btnCerrarMesa) {
    btnCerrarMesa.textContent = 'Cerrar cuenta';
  }

  const selectProd = document.getElementById('select-producto-pedido');
  const inputCant = document.getElementById('input-cantidad-pedido');
  const btnAgregarItem = document.getElementById('btn-agregar-item');
  const listaItems = document.getElementById('lista-items-pedido');
  const totalElem = document.getElementById('total-pedido');

  const productosDisponibles = productos.filter(p => p.disponible);
  selectProd.innerHTML = '<option value="">Seleccionar producto...</option>';
  productosDisponibles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.nombre} (${formatoMoneda.format(p.precio)})`;
    selectProd.appendChild(opt);
  });

  if (!mesaSeleccionadaId) {
    infoMesa.textContent = 'Ninguna mesa seleccionada';
    selectProd.disabled = true;
    inputCant.disabled = true;
    btnAgregarItem.disabled = true;
    listaItems.innerHTML = '<li>Tocá una mesa para abrir o ver su pedido.</li>';
    totalElem.textContent = formatoMoneda.format(0);
    if (btnCerrarMesa) btnCerrarMesa.disabled = true;
    return;
  }

  const mesa = mesas.find(m => m.id === mesaSeleccionadaId);
  const pedidoAbierto = pedidos.find(p => p.mesaId === mesa.id && p.estado === 'abierto');

  infoMesa.textContent = `Mesa ${mesa.numero} — Estado: ${mesa.estado.toUpperCase()}`;
  selectProd.disabled = false;
  inputCant.disabled = false;
  btnAgregarItem.disabled = false;
  if (btnCerrarMesa) btnCerrarMesa.disabled = !pedidoAbierto || pedidoAbierto.items.length === 0;

  if (!pedidoAbierto || pedidoAbierto.items.length === 0) {
    listaItems.innerHTML = '<li>Pedido abierto sin productos cargados aún.</li>';
    totalElem.textContent = formatoMoneda.format(0);
    return;
  }

  listaItems.innerHTML = '';
  let total = 0;

  pedidoAbierto.items.forEach((item, index) => {
    const subtotal = item.precio * item.cantidad;
    total += subtotal;

    const li = document.createElement('li');
    li.className = 'item-pedido-card';
    li.innerHTML = `
      <div class="item-pedido-info">
        <strong>${escapeHTML(item.nombre)}</strong>
        <small>${formatoMoneda.format(item.precio)} c/u</small>
      </div>
      <div class="item-pedido-controles">
        <button type="button" class="btn-cantidad" data-index="${index}" data-accion="decrementar">➖</button>
        <span class="item-cantidad">${item.cantidad}</span>
        <button type="button" class="btn-cantidad" data-index="${index}" data-accion="incrementar">➕</button>
        <span class="item-subtotal">${formatoMoneda.format(subtotal)}</span>
        <button type="button" class="btn-quitar-item" data-index="${index}" title="Eliminar ítem">❌</button>
      </div>
    `;
    listaItems.appendChild(li);
  });

  totalElem.textContent = formatoMoneda.format(total);
}

function agregarItemDesdePanel() {
  if (!mesaSeleccionadaId) return;

  const selectProd = document.getElementById('select-producto-pedido');
  const inputCant = document.getElementById('input-cantidad-pedido');

  const productoId = Number(selectProd.value);
  const cantidad = parseInt(inputCant.value);

  if (!productoId) {
    alert('Seleccioná un producto de la lista.');
    return;
  }

  if (isNaN(cantidad) || cantidad <= 0) {
    alert('Ingresá una cantidad válida mayor a cero.');
    inputCant.focus();
    return;
  }

  const productoOriginal = productos.find(p => p.id === productoId);
  if (!productoOriginal || !productoOriginal.disponible) {
    alert('El producto seleccionado ya no está disponible.');
    return;
  }

  let mesa = mesas.find(m => m.id === mesaSeleccionadaId);
  mesa.estado = 'ocupada';

  let pedidoAbierto = pedidos.find(p => p.mesaId === mesa.id && p.estado === 'abierto');
  if (!pedidoAbierto) {
    pedidoAbierto = {
      id: pedidos.length > 0 ? Math.max(...pedidos.map(p => p.id)) + 1 : 1,
      mesaId: mesa.id,
      items: [],
      estado: 'abierto',
      apertura: new Date().toISOString(),
      cierre: null,
      total: 0,
      formaPago: ''
    };
    pedidos.push(pedidoAbierto);
  }

  const itemExistente = pedidoAbierto.items.find(i => i.productoId === productoOriginal.id);
  if (itemExistente) {
    itemExistente.cantidad += cantidad;
  } else {
    pedidoAbierto.items.push({
      productoId: productoOriginal.id,
      nombre: productoOriginal.nombre,
      precio: productoOriginal.precio,
      cantidad: cantidad
    });
  }

  guardarDatos();
  renderizarSalon();

  selectProd.value = '';
  inputCant.value = '1';
}

function modificarCantidadItem(indexItem, accion) {
  let pedidoAbierto = pedidos.find(p => p.mesaId === mesaSeleccionadaId && p.estado === 'abierto');
  if (!pedidoAbierto || !pedidoAbierto.items[indexItem]) return;

  if (accion === 'incrementar') {
    pedidoAbierto.items[indexItem].cantidad += 1;
  } else if (accion === 'decrementar') {
    pedidoAbierto.items[indexItem].cantidad -= 1;
    if (pedidoAbierto.items[indexItem].cantidad <= 0) {
      pedidoAbierto.items.splice(indexItem, 1);
    }
  }

  guardarDatos();
  renderizarSalon();
}

function quitarItemPedido(indexItem) {
  let pedidoAbierto = pedidos.find(p => p.mesaId === mesaSeleccionadaId && p.estado === 'abierto');
  if (!pedidoAbierto) return;

  pedidoAbierto.items.splice(indexItem, 1);
  guardarDatos();
  renderizarSalon();
}

function cerrarCuentaMesaActual() {
  if (!mesaSeleccionadaId) return;

  let pedidoAbierto = pedidos.find(p => p.mesaId === mesaSeleccionadaId && p.estado === 'abierto');
  if (!pedidoAbierto || pedidoAbierto.items.length === 0) {
    alert('No se puede cerrar un pedido vacío.');
    return;
  }

  let formaPagoInput = prompt('Forma de pago:\n1. Efectivo\n2. Débito\n3. Transferencia', 'Efectivo');
  if (!formaPagoInput) return;

  formaPagoInput = formaPagoInput.trim().toLowerCase();
  let formaPago = 'Efectivo';

  if (formaPagoInput.includes('deb') || formaPagoInput === '2') {
    formaPago = 'Débito';
  } else if (formaPagoInput.includes('trans') || formaPagoInput === '3') {
    formaPago = 'Transferencia';
  } else {
    formaPago = 'Efectivo';
  }

  const total = pedidoAbierto.items.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
  const horaCierreDate = new Date();

  pedidoAbierto.estado = 'cerrado';
  pedidoAbierto.cierre = horaCierreDate.toISOString();
  pedidoAbierto.total = total;
  pedidoAbierto.formaPago = formaPago;

  let mesa = mesas.find(m => m.id === mesaSeleccionadaId);
  if (mesa) {
    mesa.estado = 'libre';
  }

  guardarDatos();

  const horaCierreStr = horaCierreDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const fechaStr = horaCierreDate.toLocaleDateString();
  
  let detalleTicket = `
╔════════════════════════════════════╗
║         BAR LA ESQUINA             ║
║      TICKET DE COBRO / MESA #${mesa ? mesa.numero : ''}       ║
╚════════════════════════════════════╝
Fecha: ${fechaStr} - Hora: ${horaCierreStr}
Forma de pago: ${formaPago.toUpperCase()}
--------------------------------------
Ítems del pedido:
`;

  pedidoAbierto.items.forEach(item => {
    const sub = item.precio * item.cantidad;
    detalleTicket += `• ${item.cantidad}x ${item.nombre} (${formatoMoneda.format(item.precio)} c/u) -> ${formatoMoneda.format(sub)}\n`;
  });

  detalleTicket += `--------------------------------------
TOTAL A PAGAR: ${formatoMoneda.format(total)}
======================================
     ¡Gracias por su visita!
`;

  alert(detalleTicket);

  mesaSeleccionadaId = null;
  renderizarSalon();
}

/* ==========================================================================
   GESTIÓN DE CARTA
   ========================================================================== */
function renderizarCarta() {
  const listaProductos = document.getElementById('lista-productos');
  if (!listaProductos) return;
  listaProductos.innerHTML = '';

  if (productos.length === 0) {
    listaProductos.innerHTML = '<li class="vacio">No hay productos cargados en la carta.</li>';
    return;
  }

  const porCategoria = productos.reduce((acc, prod) => {
    const cat = prod.categoria || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(prod);
    return acc;
  }, {});

  for (const [categoria, prods] of Object.entries(porCategoria)) {
    const liCategoria = document.createElement('li');
    liCategoria.className = 'categoria-grupo-item';

    const catTitulo = document.createElement('h4');
    catTitulo.className = 'categoria-titulo';
    catTitulo.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    liCategoria.appendChild(catTitulo);

    const ulSub = document.createElement('ul');
    ulSub.className = 'sublista-productos';

    prods.forEach(prod => {
      const liProd = document.createElement('li');
      liProd.className = prod.disponible ? 'producto-card' : 'producto-card no-disponible';
      liProd.innerHTML = `
        <div class="producto-info">
          <strong>${escapeHTML(prod.nombre)}</strong>
          <span class="producto-precio">${formatoMoneda.format(prod.precio)}</span>
        </div>
        <div class="producto-acciones">
          <label class="switch-container" title="Disponibilidad">
            <input type="checkbox" class="toggle-disponible" data-id="${prod.id}" ${prod.disponible ? 'checked' : ''}>
            <span>${prod.disponible ? '🟢' : '🔴'}</span>
          </label>
          <button type="button" class="btn-editar" data-id="${prod.id}">✏️</button>
          <button type="button" class="btn-borrar" data-id="${prod.id}">🗑️</button>
        </div>
      `;
      ulSub.appendChild(liProd);
    });

    liCategoria.appendChild(ulSub);
    listaProductos.appendChild(liCategoria);
  }
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

/* ==========================================================================
   GESTIÓN DE CAJA DEL DÍA
   ========================================================================== */
function renderizarCaja() {
  const tbody = document.getElementById('tbody-caja');
  const seccionCaja = document.getElementById('seccion-caja');
  if (!tbody || !seccionCaja) return;

  tbody.innerHTML = '';

  const hoyStr = new Date().toDateString();
  const pedidosCerradosHoy = pedidos.filter(p => {
    if (p.estado !== 'cerrado' || !p.cierre) return false;
    return new Date(p.cierre).toDateString() === hoyStr;
  });

  let resumenCajaDiv = document.getElementById('resumen-subtotales-caja');
  if (!resumenCajaDiv) {
    resumenCajaDiv = document.createElement('div');
    resumenCajaDiv.id = 'resumen-subtotales-caja';
    resumenCajaDiv.className = 'resumen-caja-tarjeta';
    const tablaCaja = document.getElementById('tabla-caja');
    tablaCaja.insertAdjacentElement('beforebegin', resumenCajaDiv);
  }

  if (pedidosCerradosHoy.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No hay movimientos registrados en la caja del día de hoy.</td></tr>';
    resumenCajaDiv.innerHTML = '<p>Sin recaudación registrada hoy.</p>';
    
    const totalCajaElem = document.getElementById('total-caja-dia');
    if (totalCajaElem) totalCajaElem.textContent = formatoMoneda.format(0);
    return;
  }

  let totalRecaudado = 0;
  let subtotalesPago = {
    Efectivo: 0,
    Débito: 0,
    Transferencia: 0
  };

  pedidosCerradosHoy.forEach(p => {
    const mesa = mesas.find(m => m.id === p.mesaId);
    const nroMesa = mesa ? mesa.numero : p.mesaId;
    const horaCierre = p.cierre ? new Date(p.cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
    const detalleItems = p.items.map(i => `${i.cantidad}x ${i.nombre}`).join(', ');

    totalRecaudado += p.total;
    
    const forma = p.formaPago || 'Efectivo';
    if (subtotalesPago[forma] !== undefined) {
      subtotalesPago[forma] += p.total;
    } else {
      subtotalesPago[forma] = p.total;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${horaCierre}</td>
      <td>Mesa ${nroMesa}</td>
      <td>${escapeHTML(detalleItems)} <br><small>(${forma})</small></td>
      <td>${formatoMoneda.format(p.total)}</td>
    `;
    tbody.appendChild(tr);
  });

  resumenCajaDiv.innerHTML = `
    <h3>Resumen por Forma de Pago</h3>
    <div class="subtotales-grid">
      <span>💵 Efectivo: <strong>${formatoMoneda.format(subtotalesPago.Efectivo)}</strong></span>
      <span>💳 Débito: <strong>${formatoMoneda.format(subtotalesPago.Débito)}</strong></span>
      <span>📱 Transferencia: <strong>${formatoMoneda.format(subtotalesPago.Transferencia)}</strong></span>
    </div>
  `;

  const totalCajaElem = document.getElementById('total-caja-dia');
  if (totalCajaElem) {
    totalCajaElem.textContent = formatoMoneda.format(totalRecaudado);
  }
}

/* ==========================================================================
   EXPORTAR E IMPORTAR DATOS (CON SUPORTE PARA navigator.share Y BLOB)
   ========================================================================== */
async function exportarDatos() {
  const datos = { productos, mesas, pedidos };
  const jsonString = JSON.stringify(datos, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const archivo = new File([blob], 'bar.json', { type: 'application/json' });

  // Verificar si el navegador soporta Web Share API y puede compartir archivos
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        title: 'Copia de seguridad - Bar La Esquina',
        text: 'Archivo JSON de respaldo del sistema de gestión.',
        files: [archivo]
      });
      return; // Salir si se compartió exitosamente
    } catch (error) {
      // Si el usuario cancela el menú de compartir, no hacemos nada más
      if (error.name !== 'AbortError') {
        console.warn('Error al usar navigator.share, procediendo con descarga tradicional:', error);
      } else {
        return;
      }
    }
  }

  // Respaldo: Descarga tradicional como archivo si no se puede compartir
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.href = url;
  downloadAnchor.download = 'bar.json';
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

function importarDatos(event) {
  const archivo = event.target.files[0];
  if (!archivo) return;

  const reader = new FileReader();
  reader.readAsText(archivo, 'UTF-8');

  reader.onload = (e) => {
    try {
      const contenido = e.target.result;
      const datosImportados = JSON.parse(contenido);

      if (
        !datosImportados ||
        typeof datosImportados !== 'object' ||
        !Array.isArray(datosImportados.productos) ||
        !Array.isArray(datosImportados.mesas) ||
        !Array.isArray(datosImportados.pedidos)
      ) {
        alert('Error: El archivo JSON no es válido o no contiene las listas requeridas (productos, mesas, pedidos). No se realizaron cambios.');
        event.target.value = '';
        return;
      }

      const confirmar = confirm('¿Estás seguro de importar estos datos? Se sobrescribirá la información actual.');
      if (confirmar) {
        productos = datosImportados.productos;
        mesas = datosImportados.mesas;
        pedidos = datosImportados.pedidos;

        guardarDatos();
        renderizarSalon();
        renderizarCarta();
        renderizarCaja();

        alert('¡Datos importados y aplicados correctamente!');
      }
    } catch (error) {
      alert('Error: El archivo seleccionado no es un JSON válido. No se modificó ningún dato.');
      console.error('Error al parsear JSON:', error);
    } finally {
      event.target.value = '';
    }
  };

  reader.onerror = () => {
    alert('Error al leer el archivo.');
    event.target.value = '';
  };
}

/* ==========================================================================
   AVISO DISCRETO DE CONECTIVIDAD (ONLINE / OFFLINE)
   ========================================================================== */
function inicializarAvisoConectividad() {
  // Crear el elemento del banner si no existe
  let banner = document.getElementById('banner-offline');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'banner-offline';
    banner.className = 'banner-offline-oculto';
    banner.textContent = 'Sin conexión: tus datos se siguen guardando en este celular';
    
    // Insertarlo al inicio del body para que quede arriba de todo
    document.body.prepend(banner);
  }

  // Función para actualizar la visibilidad según navigator.onLine
  function actualizarEstadoConexion() {
    if (!navigator.onLine) {
      banner.classList.remove('banner-offline-oculto');
      banner.classList.add('banner-offline-visible');
    } else {
      banner.classList.remove('banner-offline-visible');
      banner.classList.add('banner-offline-oculto');
    }
  }

  // Escuchar eventos globales
  window.addEventListener('online', actualizarEstadoConexion);
  window.addEventListener('offline', actualizarEstadoConexion);

  // Comprobar estado inicial al cargar
  actualizarEstadoConexion();
}

/* ==========================================================================
   INICIALIZACIÓN DE EVENTOS (DOM CONTENT LOADED)
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  cargarDatos();
  inicializarAvisoConectividad();

  // Navegación
  const botonesNav = document.querySelectorAll('#main-nav button');
  botonesNav.forEach(btn => {
    btn.addEventListener('click', () => {
      const seccionDestino = btn.dataset.section;
      if (seccionDestino) mostrarSeccion(seccionDestino);
    });
  });

  mostrarSeccion('seccion-salon');

  // Eventos Salón
  const grillaMesas = document.getElementById('grilla-mesas');
  if (grillaMesas) {
    grillaMesas.addEventListener('click', (e) => {
      const card = e.target.closest('[data-id]');
      if (card) {
        const id = Number(card.dataset.id);
        seleccionarMesa(id);
      }
    });
  }

  const panelPedido = document.getElementById('panel-pedido');
  if (panelPedido) {
    panelPedido.addEventListener('click', (e) => {
      if (e.target.id === 'btn-agregar-item') {
        agregarItemDesdePanel();
      }

      if (e.target.classList.contains('btn-cantidad')) {
        const idx = Number(e.target.dataset.index);
        const accion = e.target.dataset.accion;
        modificarCantidadItem(idx, accion);
      }

      if (e.target.classList.contains('btn-quitar-item')) {
        const idx = Number(e.target.dataset.index);
        quitarItemPedido(idx);
      }
    });
  }

  const btnCerrarMesa = document.getElementById('btn-cerrar-mesa');
  if (btnCerrarMesa) {
    btnCerrarMesa.addEventListener('click', cerrarCuentaMesaActual);
  }

  // Eventos Carta (Formulario)
  const formProducto = document.getElementById('form-producto');
  if (formProducto) {
    formProducto.addEventListener('submit', (e) => {
      e.preventDefault();
      const inputNombre = document.getElementById('prod-nombre');
      const inputCategoria = document.getElementById('prod-categoria');
      const inputPrecio = document.getElementById('prod-precio');
      const inputDisponible = document.getElementById('prod-disponible');

      const nombre = inputNombre.value.trim();
      const categoria = inputCategoria.value;
      const precio = parseFloat(inputPrecio.value);
      const disponible = inputDisponible.checked;

      if (!nombre) {
        alert('El nombre no puede estar vacío.');
        inputNombre.focus();
        return;
      }
      if (isNaN(precio) || precio <= 0) {
        alert('El precio debe ser mayor a cero.');
        inputPrecio.focus();
        return;
      }

      const nombreLower = nombre.toLowerCase();
      const duplicado = productos.some(p => p.nombre.toLowerCase() === nombreLower && p.id !== productoEnEdicionId);
      if (duplicado) {
        alert('Ya existe un producto con ese nombre.');
        inputNombre.focus();
        return;
      }

      if (productoEnEdicionId !== null) {
        productos = productos.map(p => p.id === productoEnEdicionId ? { ...p, nombre, categoria, precio, disponible } : p);
        productoEnEdicionId = null;
        formProducto.querySelector('legend').textContent = 'Nuevo / Editar Producto';
      } else {
        const nuevoId = productos.length > 0 ? Math.max(...productos.map(p => p.id)) + 1 : 1;
        productos.push({ id: nuevoId, nombre, categoria, precio, disponible });
      }

      guardarDatos();
      renderizarCarta();
      formProducto.reset();
      inputDisponible.checked = true;
    });
  }

  const listaProductos = document.getElementById('lista-productos');
  if (listaProductos) {
    listaProductos.addEventListener('click', (e) => {
      const target = e.target;
      const id = Number(target.dataset.id);
      if (!id) return;

      if (target.classList.contains('btn-editar')) {
        const prod = productos.find(p => p.id === id);
        if (prod) {
          document.getElementById('prod-nombre').value = prod.nombre;
          document.getElementById('prod-categoria').value = prod.categoria;
          document.getElementById('prod-precio').value = prod.precio;
          document.getElementById('prod-disponible').checked = prod.disponible;
          productoEnEdicionId = prod.id;
          formProducto.querySelector('legend').textContent = `Editando producto #${prod.id}`;
          document.getElementById('prod-nombre').focus();
        }
      }

      if (target.classList.contains('btn-borrar')) {
        const prod = productos.find(p => p.id === id);
        if (prod && confirm(`¿Eliminar "${prod.nombre}" de la carta?`)) {
          productos = productos.filter(p => p.id !== id);
          guardarDatos();
          renderizarCarta();
          if (productoEnEdicionId === id) {
            productoEnEdicionId = null;
            formProducto.reset();
            formProducto.querySelector('legend').textContent = 'Nuevo / Editar Producto';
          }
        }
      }
    });

    listaProductos.addEventListener('change', (e) => {
      if (e.target.classList.contains('toggle-disponible')) {
        const id = Number(e.target.dataset.id);
        const prod = productos.find(p => p.id === id);
        if (prod) {
          prod.disponible = e.target.checked;
          guardarDatos();
          renderizarCarta();
        }
      }
    });
  }

  // Exportar / Importar
  const btnExportar = document.getElementById('btn-exportar');
  const btnImportar = document.getElementById('btn-importar');
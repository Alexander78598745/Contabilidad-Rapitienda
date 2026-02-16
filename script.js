// --- BASE DE DATOS E INICIALIZACIÓN ---
let db = { 
    cierres: [], 
    usuarios: [{name: 'Admin', pass: 'admin123', role: 'Admin'}] 
};

try {
    const loadedData = localStorage.getItem('rapitienda_db');
    if (loadedData) db = JSON.parse(loadedData);
    db.usuarios.forEach(u => { if(!u.name) u.name = 'Usuario'; });
} catch (e) {
    console.warn("Modo sin persistencia.");
}

let currentUser = null;

// --- NAVEGACIÓN ---
function nav(moduleId) {
    if(moduleId !== 'caja') cancelEdit();
    if(moduleId !== 'usuarios') cancelUserEdit();

    document.querySelectorAll('.module').forEach(m => {
        m.classList.remove('active-module');
        m.style.display = 'none';
    });

    const target = document.getElementById('mod-' + moduleId);
    if (target) {
        target.classList.add('active-module');
        target.style.display = 'block';
    }

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active-nav'));
    const activeBtn = document.getElementById('btn-' + moduleId);
    if(activeBtn) activeBtn.classList.add('active-nav');

    if(moduleId === 'historial') renderHistorial();
    if(moduleId === 'usuarios') renderUsers();
}

// --- LOGIN ---
function checkLogin() {
    const pass = document.getElementById('login-pass').value;
    
    if(db.usuarios.length === 0) db.usuarios.push({name: 'Admin', pass: 'admin123', role: 'Admin'});

    const user = db.usuarios.find(u => u.pass === pass);
    
    if (user) {
        currentUser = user;
        document.getElementById('login-screen').classList.remove('active-flex');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').classList.add('active-block');
        document.getElementById('main-app').style.display = 'block';

        document.getElementById('header-username').innerText = user.name;

        const btnUsers = document.getElementById('btn-usuarios');
        if(user.role === 'Empleado') {
            if(btnUsers) btnUsers.style.display = 'none';
        } else {
            if(btnUsers) btnUsers.style.display = 'flex';
        }

        updateStats();
        nav('inicio');
    } else {
        alert("Contraseña incorrecta.");
    }
}

function logout() { location.reload(); }

// --- PERSISTENCIA & BACKUP ---
function saveDB() {
    try {
        localStorage.setItem('rapitienda_db', JSON.stringify(db));
    } catch (e) { console.error("Error guardando DB"); }
}

function exportBackup() {
    const dataStr = JSON.stringify(db);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `Rapitienda_Backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

function importBackup(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if(json.cierres && json.usuarios) {
                db = json;
                saveDB();
                alert("Backup restaurado con éxito. La página se recargará.");
                location.reload();
            } else {
                alert("Error: Archivo no válido (Faltan datos de usuarios o cierres).");
            }
        } catch (ex) {
            alert("Error al leer el archivo.");
        }
    };
    reader.readAsText(file);
}


function formatMoney(amount) {
    return '$ ' + amount.toLocaleString('es-CO');
}

// --- MÓDULO INICIO ---
function updateStats() {
    try {
        const now = new Date();
        const mesActual = now.getMonth(); 
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - offset)).toISOString().slice(0, 10);

        const ventasMes = db.cierres
            .filter(c => new Date(c.fecha + 'T00:00:00').getMonth() === mesActual)
            .reduce((acc, c) => acc + (c.efectivo + c.tarjeta + c.nequi), 0);

        const gastosMes = db.cierres
            .filter(c => new Date(c.fecha + 'T00:00:00').getMonth() === mesActual)
            .reduce((acc, c) => acc + c.gastos, 0);

        const cierresHoy = db.cierres.filter(c => c.fecha === localISOTime);
        const ingresosHoy = cierresHoy.reduce((acc, c) => acc + (c.efectivo + c.tarjeta + c.nequi), 0);
        const gastosHoy = cierresHoy.reduce((acc, c) => acc + c.gastos, 0);

        const balanceTotalMes = ventasMes - gastosMes;

        document.getElementById('stats-balance-hoy').innerText = formatMoney(ingresosHoy - gastosHoy);
        document.getElementById('stats-ventas-mes').innerText = formatMoney(ventasMes);
        document.getElementById('stats-gastos-mes').innerText = formatMoney(gastosMes);
        document.getElementById('stats-balance-total').innerText = formatMoney(balanceTotalMes); 

    } catch (e) { console.error("Error stats", e); }
}

// --- MÓDULO CAJA ---
function saveCierre() {
    const fecha = document.getElementById('caja-fecha').value;
    const idEdit = document.getElementById('caja-id-edit').value;
    
    if(!fecha) return alert("Selecciona una fecha");

    const datosCierre = {
        id: idEdit ? parseInt(idEdit) : Date.now(),
        fecha: fecha,
        efectivo: parseFloat(document.getElementById('caja-efectivo').value) || 0,
        tarjeta: parseFloat(document.getElementById('caja-tarjeta').value) || 0,
        nequi: parseFloat(document.getElementById('caja-nequi').value) || 0,
        gastos: parseFloat(document.getElementById('caja-gastos').value) || 0,
        tipoGasto: document.getElementById('caja-tipo-gasto').value,
        obs: document.getElementById('caja-obs').value
    };

    if (idEdit) {
        const index = db.cierres.findIndex(c => c.id === parseInt(idEdit));
        if(index !== -1) db.cierres[index] = datosCierre;
        alert("Cierre Actualizado ✅");
        cancelEdit();
    } else {
        db.cierres.push(datosCierre);
        alert("Cierre Guardado ✅");
        clearCajaForm();
    }

    saveDB();
    updateStats();
    nav('inicio');
}

function editCierre(id) {
    const cierre = db.cierres.find(c => c.id === id);
    if (!cierre) return;

    document.getElementById('caja-id-edit').value = cierre.id;
    document.getElementById('caja-fecha').value = cierre.fecha;
    document.getElementById('caja-efectivo').value = cierre.efectivo;
    document.getElementById('caja-tarjeta').value = cierre.tarjeta;
    document.getElementById('caja-nequi').value = cierre.nequi;
    document.getElementById('caja-gastos').value = cierre.gastos;
    document.getElementById('caja-tipo-gasto').value = cierre.tipoGasto || ""; 
    document.getElementById('caja-obs').value = cierre.obs;

    document.getElementById('caja-titulo').innerText = "Editar Cierre";
    document.getElementById('btn-save-cierre').innerText = "Actualizar Cierre 🔄";
    document.getElementById('btn-cancel-edit').style.display = 'block';

    nav('caja');
}

function cancelEdit() {
    clearCajaForm();
    document.getElementById('caja-titulo').innerText = "Nuevo Cierre";
    document.getElementById('btn-save-cierre').innerText = "Guardar Cierre ✅";
    document.getElementById('btn-cancel-edit').style.display = 'none';
    document.getElementById('caja-id-edit').value = "";
}

function clearCajaForm() {
    document.getElementById('caja-fecha').value = "";
    document.getElementById('caja-efectivo').value = "";
    document.getElementById('caja-tarjeta').value = "";
    document.getElementById('caja-nequi').value = "";
    document.getElementById('caja-gastos').value = "";
    document.getElementById('caja-tipo-gasto').value = "";
    document.getElementById('caja-obs').value = "";
}

// --- MÓDULO HISTORIAL ---
function renderHistorial() {
    const list = document.getElementById('lista-historial');
    const sorted = [...db.cierres].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    if(sorted.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#888;">No hay datos.</p>';
        return;
    }

    list.innerHTML = sorted.map(c => `
        <div class="history-item">
            <div>
                <div class="date-badge">${c.fecha}</div>
                <small>${c.tipoGasto ? '📂 '+c.tipoGasto : ''}</small>
            </div>
            <div style="text-align:right; display:flex; align-items:center;">
                <div style="margin-right:10px;">
                    <div class="total-badge">+ ${formatMoney(c.efectivo+c.tarjeta+c.nequi)}</div>
                    <small style="color:red">- ${formatMoney(c.gastos)}</small>
                </div>
                <div>
                    <button class="btn-edit" onclick="editCierre(${c.id})">✏️</button>
                    <button onclick="downloadOnePDF(${c.id})" style="border:none; background:none; font-size:1.2rem; cursor:pointer;">📄</button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- MÓDULO USUARIOS ---
function saveUser() {
    const name = document.getElementById('user-name').value;
    const pass = document.getElementById('user-pass').value;
    const role = document.getElementById('user-role').value;
    const indexEdit = document.getElementById('user-index-edit').value;
    
    if(!name || !pass) return alert("Completa nombre y contraseña");

    if(indexEdit) {
        db.usuarios[indexEdit] = { name, pass, role };
        alert("Usuario actualizado");
        cancelUserEdit();
    } else {
        db.usuarios.push({ name, pass, role });
        alert("Usuario creado");
        document.getElementById('user-name').value = '';
        document.getElementById('user-pass').value = '';
    }
    
    saveDB();
    renderUsers();
}

function editUser(index) {
    const u = db.usuarios[index];
    document.getElementById('user-name').value = u.name;
    document.getElementById('user-pass').value = u.pass;
    document.getElementById('user-role').value = u.role;
    document.getElementById('user-index-edit').value = index;

    document.getElementById('user-form-title').innerText = "Editar Usuario";
    document.getElementById('btn-save-user').innerText = "Actualizar";
    document.getElementById('btn-cancel-user').style.display = 'inline-block';
}

function cancelUserEdit() {
    document.getElementById('user-name').value = '';
    document.getElementById('user-pass').value = '';
    document.getElementById('user-index-edit').value = '';
    document.getElementById('user-form-title').innerText = "Gestionar Personal";
    document.getElementById('btn-save-user').innerText = "Crear Usuario";
    document.getElementById('btn-cancel-user').style.display = 'none';
}

function renderUsers() {
    const div = document.getElementById('user-list');
    div.innerHTML = db.usuarios.map((u, i) => `
        <div class="user-card">
            <div class="user-info">
                <strong>${u.name}</strong>
                <small>${u.role} | Clave: ${u.pass}</small>
            </div>
            <div class="user-actions">
                <button class="btn-edit" onclick="editUser(${i})">✏️</button>
                ${i > 0 ? `<button class="btn-delete" onclick="deleteUser(${i})">🗑️</button>` : ''}
            </div>
        </div>
    `).join('');
}

function deleteUser(i) {
    if(confirm("¿Eliminar usuario?")) {
        db.usuarios.splice(i, 1);
        saveDB();
        renderUsers();
    }
}

// --- PDF PROFESIONAL ---
function drawHeader(doc) {
    doc.setFillColor(13, 35, 84);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("RAPITIENDA CAMPO ALEGRE", 105, 18, null, null, "center");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Calle 37 1A-04 | Cartago Valle | Tel: 3225713087", 105, 26, null, null, "center");
    doc.setDrawColor(228, 51, 42);
    doc.setLineWidth(1.5);
    doc.line(0, 36, 210, 36);
}

function downloadOnePDF(id) {
    if(typeof window.jspdf === 'undefined') return alert("Librería PDF no cargada.");
    const c = db.cierres.find(x => x.id === id);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    drawHeader(doc);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text("REPORTE DE CIERRE DIARIO", 14, 50);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Fecha del Cierre: ${c.fecha}`, 14, 58);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 140, 58);

    const data = [
        ["Concepto", "Valor"],
        ["Efectivo", formatMoney(c.efectivo)],
        ["Tarjeta", formatMoney(c.tarjeta)],
        ["Nequi", formatMoney(c.nequi)],
        ["TOTAL VENTAS", formatMoney(c.efectivo + c.tarjeta + c.nequi)],
        ["- Gastos (" + (c.tipoGasto || "General") + ")", formatMoney(c.gastos)],
        ["BALANCE FINAL", formatMoney((c.efectivo + c.tarjeta + c.nequi) - c.gastos)]
    ];

    doc.autoTable({
        startY: 65,
        head: [['Detalle Financiero', 'Monto']],
        body: data,
        theme: 'grid',
        headStyles: { fillColor: [13, 35, 84], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
        styles: { fontSize: 11, cellPadding: 6 },
        alternateRowStyles: { fillColor: [242, 242, 247] }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    if(c.obs) {
        doc.setFontSize(11);
        doc.setTextColor(13, 35, 84);
        doc.text("Observaciones:", 14, finalY);
        doc.setFontSize(10);
        doc.setTextColor(50);
        doc.text(c.obs, 14, finalY + 6, { maxWidth: 180 });
    }
    doc.save(`Cierre_${c.fecha}.pdf`);
}

function generateReportPDF() {
    if(typeof window.jspdf === 'undefined') return alert("Librería PDF no disponible");
    
    const desde = document.getElementById('rep-desde').value;
    const hasta = document.getElementById('rep-hasta').value;
    if(!desde || !hasta) return alert("Selecciona fechas");

    const filtrados = db.cierres.filter(c => c.fecha >= desde && c.fecha <= hasta);
    if(filtrados.length === 0) return alert("No hay datos en ese rango");

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    drawHeader(doc);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(`REPORTE GENERAL DE VENTAS`, 14, 50);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periodo: ${desde} al ${hasta}`, 14, 58);

    let tVentas = 0, tGastos = 0;
    const rows = filtrados.map(c => {
        const venta = c.efectivo + c.tarjeta + c.nequi;
        tVentas += venta;
        tGastos += c.gastos;
        return [c.fecha, formatMoney(venta), formatMoney(c.gastos), formatMoney(venta - c.gastos)];
    });

    rows.push(["TOTALES", formatMoney(tVentas), formatMoney(tGastos), formatMoney(tVentas - tGastos)]);

    doc.autoTable({
        startY: 65,
        head: [['Fecha', 'Ventas', 'Gastos', 'Balance']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [228, 51, 42], textColor: 255 },
        columnStyles: { 
            0: { halign: 'center' }, 
            1: { halign: 'center' }, 
            2: { halign: 'center' }, 
            3: { halign: 'center', fontStyle: 'bold' } 
        },
        styles: { fontSize: 10 },
        didParseCell: function (data) {
            if (data.row.index === rows.length - 1) {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [220, 220, 220];
            }
        }
    });

    doc.save(`Reporte_General_${desde}.pdf`);
}
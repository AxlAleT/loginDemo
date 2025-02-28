$(document).ready(function () {
    loadUsuarios();
    const token = $("meta[name='_csrf']").attr("content");
    const header = $("meta[name='_csrf_header']").attr("content");
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader(header, token);
        }
    });
});

function loadUsuarios() {
    $.ajax({
        url: '/api/admin/usuarios',
        type: 'GET',
        dataType: 'json',
        success: function (usuarios) {
            populateUsuariosTable(usuarios);
        },
        error: function () {
            showAlert('#errorAlert', 'Error al cargar usuarios.');
        }
    });
}

function populateUsuariosTable(usuarios) {
    const tbody = $('#usuariosTable tbody');
    tbody.empty(); // Limpiar la tabla antes de rellenar

    $.each(usuarios, function (index, usuario) {
        const row = $('<tr>').append(
            $('<td>').text(usuario.id),
            $('<td>').text(usuario.nombre),
            $('<td>').text(usuario.email),
            $('<td>').text(usuario.rol),
            $('<td>').append(
                $('<button>').addClass('btn btn-sm btn-primary mr-1').text('Editar').on('click', function () {
                    showEditModal(usuario.id, usuario.nombre, usuario.email, usuario.rol);
                }),
                $('<button>').addClass('btn btn-sm btn-danger').text('Eliminar').on('click', function () {
                    deleteUser(usuario.id);
                })
            )
        );
        tbody.append(row);
    });
}

function showCreateModal() {
    $('#modalTitle').text('Crear Usuario');
    $('#userId').val('');
    $('#nombre').val('');
    $('#email').val('');
    $('#password').val('');
    $('#rol').val('ROLE_USER');
    $('#passwordHelpText').hide();
    $('#saveButton').off('click').on('click', createUser);
    $('#userModal').modal('show');
}

function showEditModal(id, nombre, email, rol) {
    $('#modalTitle').text('Editar Usuario');
    $('#userId').val(id);
    $('#nombre').val(nombre);
    $('#email').val(email);
    $('#password').val('');
    $('#rol').val(rol);
    $('#passwordHelpText').show();
    $('#saveButton').off('click').on('click', updateUser);
    $('#userModal').modal('show');
}

function createUser() {
    const userData = {
        nombre: $('#nombre').val(),
        email: $('#email').val(),
        password: $('#password').val(),
        rol: $('#rol').val()
    };

    $.ajax({
        url: '/api/admin/usuarios',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(userData),
        success: function () {
            $('#userModal').modal('hide');
            showAlert('#successAlert', 'Usuario creado correctamente.');
            loadUsuarios(); // Recargar la tabla de usuarios
        },
        error: function (xhr) {
            showAlert('#errorAlert', xhr.responseJSON?.message || 'Error al crear usuario');
        }
    });
}

function updateUser() {
    const id = $('#userId').val();
    const userData = {
        nombre: $('#nombre').val(),
        email: $('#email').val(),
        rol: $('#rol').val()
    };

    // Solo incluir contraseña si se ha ingresado
    if ($('#password').val()) {
        userData.password = $('#password').val();
    }

    $.ajax({
        url: '/api/admin/usuarios/' + id,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(userData),
        success: function () {
            $('#userModal').modal('hide');
            showAlert('#successAlert', 'Usuario actualizado correctamente.');
            loadUsuarios(); // Recargar la tabla de usuarios
        },
        error: function (xhr) {
            showAlert('#errorAlert', xhr.responseJSON?.message || 'Error al actualizar usuario');
        }
    });
}

function deleteUser(id) {
    if (confirm('¿Está seguro de que desea eliminar este usuario?')) {
        $.ajax({
            url: '/api/admin/usuarios/' + id,
            type: 'DELETE',
            success: function () {
                showAlert('#successAlert', 'Usuario eliminado correctamente.');
                loadUsuarios(); // Recargar la tabla de usuarios
            },
            error: function () {
                showAlert('#errorAlert', 'Error al eliminar usuario.');
            }
        });
    }
}

function showAlert(selector, message) {
    if (message) {
        $(selector).text(message);
    }
    $(selector).fadeIn().delay(3000).fadeOut();
}

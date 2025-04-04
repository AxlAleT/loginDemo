$(document).ready(function () {
    loadUsers();
    const token = $("meta[name='_csrf']").attr("content");
    const header = $("meta[name='_csrf_header']").attr("content");
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader(header, token);
        }
    });
});

function loadUsers() {
    $.ajax({
        url: '/api/admin/users',
        type: 'GET',
        dataType: 'json',
        success: function (users) {
            populateUsersTable(users);
        },
        error: function () {
            showAlert('#errorAlert', 'Error loading users.');
        }
    });
}

function populateUsersTable(users) {
    const tbody = $('#usersTable tbody');
    tbody.empty(); // Clear the table before filling

    $.each(users, function (index, user) {
        const row = $('<tr>').append(
            $('<td>').text(user.id),
            $('<td>').text(user.nombre),
            $('<td>').text(user.email),
            $('<td>').text(user.rol),
            $('<td>').append(
                $('<button>').addClass('btn btn-sm btn-primary mr-1').text('Edit').on('click', function () {
                    showEditModal(user.id, user.nombre, user.email, user.rol);
                }),
                $('<button>').addClass('btn btn-sm btn-danger').text('Delete').on('click', function () {
                    deleteUser(user.id);
                })
            )
        );
        tbody.append(row);
    });
}

function showCreateModal() {
    $('#modalTitle').text('Create User');
    $('#userId').val('');
    $('#name').val('');
    $('#email').val('');
    $('#password').val('');
    $('#role').val('ROLE_USER');
    $('#passwordHelpText').hide();
    $('#saveButton').off('click').on('click', createUser);
    $('#userModal').modal('show');
}

function showEditModal(id, nombre, email, rol) {
    $('#modalTitle').text('Edit User');
    $('#userId').val(id);
    $('#name').val(nombre);
    $('#email').val(email);
    $('#password').val('');
    $('#role').val(rol);
    $('#passwordHelpText').show();
    $('#saveButton').off('click').on('click', updateUser);
    $('#userModal').modal('show');
}

function createUser() {
    const userData = {
        nombre: $('#name').val(),
        email: $('#email').val(),
        password: $('#password').val(),
        rol: $('#role').val()
    };

    $.ajax({
        url: '/api/admin/users',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(userData),
        success: function () {
            $('#userModal').modal('hide');
            showAlert('#successAlert', 'User created successfully.');
            loadUsers(); // Reload the users table
        },
        error: function (xhr) {
            showAlert('#errorAlert', xhr.responseJSON?.message || 'Error creating user');
        }
    });
}

function updateUser() {
    const id = $('#userId').val();
    const userData = {
        nombre: $('#name').val(),
        email: $('#email').val(),
        rol: $('#role').val()
    };

    // Only include password if entered
    if ($('#password').val()) {
        userData.password = $('#password').val();
    }

    $.ajax({
        url: '/api/admin/users/' + id,
        type: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(userData),
        success: function () {
            $('#userModal').modal('hide');
            showAlert('#successAlert', 'User updated successfully.');
            loadUsers(); // Reload the users table
        },
        error: function (xhr) {
            showAlert('#errorAlert', xhr.responseJSON?.message || 'Error updating user');
        }
    });
}

function deleteUser(id) {
    if (confirm('Are you sure you want to delete this user?')) {
        $.ajax({
            url: '/api/admin/users/' + id,
            type: 'DELETE',
            success: function () {
                showAlert('#successAlert', 'User deleted successfully.');
                loadUsers(); // Reload the users table
            },
            error: function () {
                showAlert('#errorAlert', 'Error deleting user.');
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


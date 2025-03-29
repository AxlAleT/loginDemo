$(document).ready(function () {
    loadUserSummary(); // Load user summary data when the page is ready
});

function loadUserSummary() {
    $.ajax({
        url: '/api/admin/usuarios', // Same endpoint to get all users
        type: 'GET',
        dataType: 'json',
        success: function (usuarios) {
            updateUserSummaryTable(usuarios);
        },
        error: function () {
            showAlert('#errorAlert', 'Error al cargar el resumen de usuarios.');
        }
    });
}

function updateUserSummaryTable(usuarios) {
    const totalUsers = usuarios.length;
    let adminUsersCount = 0;
    let standardUsersCount = 0;

    $.each(usuarios, function (index, usuario) {
        if (usuario.rol === 'ROLE_ADMIN') {
            adminUsersCount++;
        } else if (usuario.rol === 'ROLE_USER') { // Assuming 'ROLE_USER' is the standard role
            standardUsersCount++;
        }
    });

    $('#totalUsers').text(totalUsers);
    $('#adminUsers').text(adminUsersCount);
    $('#standardUsers').text(standardUsersCount);
}

function showAlert(selector, message) {
    if (message) {
        $(selector).text(message);
    }
    $(selector).fadeIn().delay(3000).fadeOut();
}

/*global ace */

var content = document.getElementById("content");
content.style.height = '400px';

var editor = ace.edit("content");
editor.session.setMode("ace/mode/json");

document.getElementById("btn-update").addEventListener('click', function() {
    try {
        var config = JSON.stringify(JSON.parse(editor.getValue()));
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/settings");
        document.getElementById("btn-update").innerHTML = '<div class="spinner spinner-white"></div>';
        xhr.onreadystatechange = function() {
            if (xhr.readyState == 4 && xhr.status == 200) {
                document.getElementById("btn-update").innerHTML = 'Update';
            }
        }
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhr.send(config);
    } catch(ex) {
        document.getElementById("btn-update").classList.remove('btn-primary')
        document.getElementById("btn-update").classList.add('btn-warning')
        document.getElementById("btn-update").innerHTML = 'Malformed JSON';
        setTimeout(function() {
            document.getElementById("btn-update").classList.remove('btn-warning')
            document.getElementById("btn-update").classList.add('btn-primary')
            document.getElementById("btn-update").innerHTML = 'Update';
        }, 2000)
    }
})

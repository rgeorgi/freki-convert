/**
 * Created by rgeorgi on 5/8/17.
 */

function doConvert() {
    // var form = $('#fileForm')[0];
    // var formData = new FormData(form);
    // console.log(formData);
    var file = $('#file')[0].files[0];

    var formdata = new FormData($('#fileForm')[0]);

    setStatus('Converting to freki...');
    $('#loading').show();

    $.ajax({
        url:baseURL+'/convert',
        method:'POST',
        data:file,
        processData:false,
        contentType:false,
        success:convertSuccess,
        failure:convertFailure,
        complete:function(){
            $('#loading').hide();
            clearStatus();
        }
    }
    )
}

function displayFreki(frekiData) {
    var retStr = '';
    var frekiLines = frekiData.split('\n');
    for (i=0;i<frekiLines.length;i++) {
        var frekiLine = frekiLines[i];
        frekiLine.replace(' ', '&nbsp;');
        retStr = retStr + frekiLine + '<BR/>';
    }
    return retStr;
}

function convertSuccess(data, status, jqXHR) {
    $('#output').html(displayFreki(data));
}

function convertFailure(data, status, jqXHR) {
    console.log(status);
}

function setStatus(s) {
    $('#status-text').text(s);
}

function clearStatus() {
    $('#status-text').text('');
}

function validateFile(elt) {
    clearStatus();
    var file = elt.files[0];
    if (!file['name'].endsWith('.pdf')) {
        setStatus("File does not appear to be a PDF.");
    }
}
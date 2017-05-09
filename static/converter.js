/**
 * Created by rgeorgi on 5/8/17.
 */

function doConvert() {
    // var form = $('#fileForm')[0];
    // var formData = new FormData(form);
    // console.log(formData);
    var file = $('#file')[0].files[0];

    var formdata = new FormData($('#fileForm')[0]);

    // Do all the resetting of the page elements
    setStatus('Converting to freki...');
    $('#loading').show();
    $('#output-pre').html('');
    $('#output').hide();
    showPreambles = true;

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

        // If the line is blank:
        if (!frekiLine.trim()) {
            retStr = retStr + '<BR/>';

        // Doc_ID Lines
        } else if (frekiLine.startsWith('doc_id')) {
            retStr = retStr + '<span class="preamble">' + frekiLine + '</span>' + '<BR/>';

        // Other lines
        } else {
            var reg_arr = /(.*?):(.*)/.exec(frekiLine);
            retStr = retStr + '<span class="preamble">' + reg_arr[1] + ':</span>' +
                    '<span class="content">' + reg_arr[2] + '</span><BR/>';
        }
    }
    return retStr;
}

function convertSuccess(data, status, jqXHR) {
    $('#output-pre').html(displayFreki(data));
    $('#output').show();
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

function togglePreambles() {
    if (showPreambles) {
        $('.preamble').hide();
        showPreambles = false;
    } else {
        $('.preamble').show();
        showPreambles = true;
    }
}
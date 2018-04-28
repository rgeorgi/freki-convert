/**
 * Created by rgeorgi on 5/8/17.
 */

function doConvert() {
    // var form = $('#fileForm')[0];
    // var formData = new FormData(form);
    // console.log(formData);
    var file = $('#file')[0].files[0];

    // Check to see if an engine is selected
    var engine = $('input[name=engine]:checked').val();

    if (!fileIsValid) {
        setStatus("Please select a valid PDF file.");
    } else if (file.size > 1048576 && engine == 'tet') {
        setStatus('TET Demo license requires files < 1MB.')
    } else {

        var url = engine != 'tet' ? '/convert'  : '/tet-convert';
        url = baseURL + url;

        // Do all the resetting of the page elements
        setStatus('Converting to ' + formatName + '<BR/>This may take some time for large documents.');
        $('#loading').show();
        $('#output-pre').html('');
        $('#output').hide();
        showPreambles = true;
        showRaw = false;

        $.ajax({
                url: url,
                method: 'POST',
                data: file,
                processData: false,
                contentType: false,
                success: convertSuccess,
                error: convertError,
                complete: function () {
                    $('#loading').hide();
                }
            }
        );

        $.ajax({
            url: baseURL + '/convert-pdftotext',
            method: 'POST',
            data: file,
            processData: false,
            contentType: false,
            success:rawTextSuccess,
            error:rawTextError
        });
    }
}

function keyValParse(s) {
    retStr = '';
    keyval_re = /([^=]+)=([^= ]+)/g;
    keyval_matches = keyval_re.exec(s);
    var prev_index = 0;
    while (keyval_matches != null) {
        retStr += '<span class="key">' + keyval_matches[1] + '</span>=<span class="val">' + keyval_matches[2] + '</span>';
        prev_index = keyval_matches.index+keyval_matches[0].length;
        keyval_matches = keyval_re.exec(s);
    }
    retStr += s.substring(prev_index);
    return retStr;
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
            retStr += '<span class="doc"><span class="preamble">' + keyValParse(frekiLine) + '</span></span><BR/>';

        // Other lines
        } else {
            var reg_arr = /(.*?):(.*)/.exec(frekiLine);
            var line_pre = reg_arr[1];
            var line_content = reg_arr[2];

            retStr += '<span class="line"><span class="preamble">' + keyValParse(line_pre) + ':</span>' +
                       '<span class="content">'+ line_content + '</span></span><BR/>';

        }
    }
    return retStr;
}

function rawTextSuccess(data, status, jqXHR) {
    $('#output-raw').html(data);
}
function rawTextError(data, status, jqXHR) {
    $('#output-raw').html('Error running pdftotext.');
}

function convertSuccess(data, status, jqXHR) {
    clearStatus();
    $('#output-pre').html(displayFreki(data));
    $('#output').show();

    localStorage.setItem('frekidoc', data);

    var dn = $('#downloadbutton');

    dn.click(function() {
        var frekidoc = localStorage.getItem('frekidoc');
        this.download='exportedDoc.txt';
        this.href='data:text/plain;charset=UTF-8,' +
            encodeURIComponent(frekidoc);
    });
}

function convertError(data, status, jqXHR) {
    setStatus("There was an error processing the document: ");
}

function setStatus(s, warn) {
    var st = $('#status-text');
    st.removeClass('warning');
    st.html(s);
    if (typeof(warn) !== undefined) {
        $('#status-text').addClass('warning');
    }

}

function clearStatus() {
    $('#status-text').text('');
    $('#status-text').removeClass('warning');
}

function validateFile(elt) {
    clearStatus();
    var file = elt.files[0];
    if (!file['name'].endsWith('.pdf')) {
        setStatus("File does not appear to be a PDF.");
        fileIsValid = false;
    } else {
        fileIsValid = true;
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

function togglePDFtoText() {
    if (showRaw) {
        $('#output-pre').show();
        $('#output-raw').hide();
        showRaw = false;
    } else {
        $('#output-raw').show();
        $('#output-pre').hide();
        showRaw = true;
    }
}
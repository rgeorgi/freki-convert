/**
 * Created by rgeorgi on 5/8/17.
 */

function doConvert() {
    // var form = $('#fileForm')[0];
    // var formData = new FormData(form);
    // console.log(formData);
    var file = $('#file')[0].files[0];

    if (!fileIsValid) {
        setStatus("Please select a valid PDF file.");
    } else {

        var formdata = new FormData($('#fileForm')[0]);

        // Do all the resetting of the page elements
        setStatus('Converting to freki...<BR/>This may take some time for large documents.');
        $('#loading').show();
        $('#output-pre').html('');
        $('#output').hide();
        showPreambles = true;

        $.ajax({
                url: baseURL + '/convert',
                method: 'POST',
                data: file,
                processData: false,
                contentType: false,
                success: convertSuccess,
                failure: convertFailure,
                complete: function () {
                    $('#loading').hide();
                    clearStatus();
                }
            }
        )
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

function convertSuccess(data, status, jqXHR) {
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

function convertFailure(data, status, jqXHR) {
    console.log(status);
}

function setStatus(s, warn) {
    var st = $('#status-text');
    st.removeClass('warning');
    st.text(s);
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
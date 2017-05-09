"""
Main index file for flask page.
"""
import os
import sys
from tempfile import TemporaryFile

import matplotlib as mpl
import re

mpl.use('agg')

# -------------------------------------------
# Start by ingesting config ifle.
# -------------------------------------------
from configparser import ConfigParser

class DefCP(ConfigParser):
    def get(self, option, *args, **kwargs):
        return super().get('DEFAULT', option, **kwargs)
    def dict(self):
        return {k:self.get(k) for k in self.defaults().keys()}

config = DefCP()
mydir = os.path.dirname(__file__)
conf_path = os.path.join(mydir, 'config.ini')
config.read(conf_path)

# -------------------------------------------
# Add items from the pythonpath var.
# -------------------------------------------
for path in config.get('pythonpath', '').split(':'):
    sys.path.insert(0, path)


# -------------------------------------------
# Set up flask.
# -------------------------------------------
from flask import Flask, render_template, request

app = Flask(__name__)
application = app

# -------------------------------------------
# Import PDFMiner
# -------------------------------------------
from pdfminer.converter import XMLConverter, HTMLConverter
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage, PDFDocument
from pdfminer.layout import LAParams
from io import StringIO, BytesIO

def run_pdfminer_xml(pdf_data):
    return run_pdfminer(pdf_data, XMLConverter)

def run_pdfminer_html(pdf_data):
    return run_pdfminer(pdf_data, HTMLConverter)

def run_pdfminer(pdf_data, converter_cls):
    """
    :rtype: StringIO
    """
    rsrcmgr = PDFResourceManager()
    out_fp = BytesIO()
    converter = converter_cls(rsrcmgr, out_fp, laparams=LAParams())

    in_data = BytesIO(pdf_data)
    interpreter = PDFPageInterpreter(rsrcmgr, converter)

    for page in PDFPage.get_pages(in_data):
        interpreter.process_page(page)

    in_data.close()
    converter.close()

    out_fp.flush()


    return StringIO(out_fp.getvalue().decode('utf-8'))


# -------------------------------------------
# Run freki on pdfminer
# -------------------------------------------
from freki.main import process
from freki.analyzers.xycut import XYCutAnalyzer
from freki.readers.pdfminer import PdfMinerReader

def pdfminer_to_freki(pdfminer_data):
    out_fp = BytesIO()

    pmr_reader = PdfMinerReader(pdfminer_data)
    analyzer = XYCutAnalyzer()
    doc = analyzer.analyze(reader=pmr_reader)

    process(doc, out_fp)

    return StringIO(out_fp.getvalue().decode('utf-8'))




# -------------------------------------------
# Set up default route.
# -------------------------------------------
@app.route('/')
def index():
    return render_template('index.html', **config.dict())

# -------------------------------------------
# Set up the conversion API call, using PDFMiner.
# -------------------------------------------

def htmlify_freki(freki_data):
    ret_str = ''
    for line in freki_data:

        # --1) Display the preamble
        if line.startswith('doc_id'):
            ret_str += '<B>{}</B>'.format(line)

        # --2) Display line content
        elif line.startswith('line='):
            preamble, content = re.search('(.*?):(.*)$', line).groups()
            ret_str += '<I>{}</I> :<span style="color:red">{}</span>'.format(preamble, content)

        ret_str += '<BR/>'
    return ret_str


@app.route('/convert', methods=['POST'])
def convert():

    # --1) Request the file data sent in the POST request.
    data = request.get_data()


    sys.stderr.write(str(data));

    # --2) Get the StringIO object from pdfminer.
    pdfminer_data = run_pdfminer_xml(data)

    # --3) Get the StringIO object from freki.
    freki_data = pdfminer_to_freki(pdfminer_data)

    # --4) Return the converted freki document.
    return freki_data.getvalue()


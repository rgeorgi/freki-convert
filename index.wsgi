"""
Main index file for flask page.
"""
import os
import sys
import re
import subprocess as sub
from tempfile import NamedTemporaryFile

# -------------------------------------------
# Because, evidently, something here renders
# stuff with MPL, if we don't use the 'AGG'
# renderer, it'll try to run setugid(), which
# is not allowed.
# -------------------------------------------
import matplotlib as mpl
mpl.use('AGG')

# -------------------------------------------
# Start by ingesting config ifle.
# -------------------------------------------
from configparser import ConfigParser

class DefCP(ConfigParser):
    """
    Quick subclass of ConfigParser, to default to "DEFAULT" section.
    """
    def get(self, option, *args, **kwargs):
        return super().get('DEFAULT', option, **kwargs)
    def getint(self, option, *args, **kwargs):
        val = self.get(option, *args, **kwargs)
        return val if val is None else int(val)
    def dict(self):
        return {k:self.get(k) for k in self.defaults().keys()}

config = DefCP()
mydir = os.path.dirname(__file__)
conf_path = os.path.join(mydir, 'config.ini')
config.read(conf_path)

if not config.get('format_name'):
    config.set('DEFAULT', 'format_name', 'Freki')

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
from freki.readers.tetml import TetmlReader

def pdfminer_to_freki(pdfminer_data):
    out_fp = BytesIO()

    pmr_reader = PdfMinerReader(pdfminer_data)
    analyzer = XYCutAnalyzer()
    doc = analyzer.analyze(reader=pmr_reader)

    process(doc, out_fp)

    return StringIO(out_fp.getvalue().decode('utf-8'))

def tetml_to_freki(tetml_data):
    out_fp = BytesIO()

    tetml_r = TetmlReader(tetml_data)
    analyzer = XYCutAnalyzer()
    doc = analyzer.analyze(reader=tetml_r)

    process(doc, out_fp)

    return StringIO(out_fp.getvalue().decode('utf-8'))

# -------------------------------------------
# Run a PDF through pdftotext
# -------------------------------------------
def run_pdftotext(pdf_data):
    with NamedTemporaryFile('wb') as tf:
        tf.write(pdf_data)
        tf.flush()

        p = sub.Popen(['pdftotext',
                       tf.name,
                       '-'], stdout=sub.PIPE)

        output = ''.join([s.decode('utf-8') for s in p.stdout.readlines()])
        p.wait()
    return output



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

    cropped_data = limit_pdf(data, config.getint('max_pages'))

    # --2) Get the StringIO object from pdfminer.
    pdfminer_data = run_pdfminer_xml(cropped_data)

    # --3) Get the StringIO object from freki.
    freki_data = pdfminer_to_freki(pdfminer_data)

    # --4) Return the converted freki document.
    return freki_data.getvalue()

@app.route('/convert-pdftotext', methods=['POST'])
def convert_pdftotext():
    """
    Use pdftotext to convert the pdf data.
    """
    pdf_data = request.get_data()
    return run_pdftotext(pdf_data)

# =============================================================================
# Crop PDF pages
# =============================================================================
from PyPDF2 import PdfFileWriter, PdfFileReader
def limit_pdf(data, max_pages=None):
    """
    :param data: Bytes for PDF
    :param max_pages: Maximum number of pages
    :return:
    """
    in_pdf = PdfFileReader(BytesIO(data))

    input_pages = in_pdf.getNumPages()

    page_limit = input_pages if max_pages is None else (min(input_pages, max_pages))

    out_pdf = PdfFileWriter()

    for page_num in range(page_limit):
        pdf_p = in_pdf.getPage(page_num)
        out_pdf.addPage(pdf_p)

    out_fp = BytesIO()
    out_pdf.write(out_fp)
    return out_fp.getvalue()



# =============================================================================
# TET Conversion
# =============================================================================
from PDFlib.TET import TET

def run_tet_xml(data):

    tet = TET()
    globaloptlist = "searchpath={{../data} {../../../resource/cmap}}"
    basedocoptlist = ""
    pageoptlist = "granularity=word tetml={glyphdetails={all}}"

    tet.set_option(globaloptlist)
    docoptlist = "tetml={} %s" % basedocoptlist

    data_io = BytesIO(data)

    doc = tet.open_document_mem(data, docoptlist)

    if doc == -1:
        sys.stderr.write(tet.get_errmsg()+'\n')
        sys.exit()

    n_pages = int(tet.pcos_get_number(doc, "length:pages"))

    for pageno in range(1, n_pages+1):
        tet.process_page(doc, pageno, pageoptlist)
    tet.process_page(doc, 0, "tetml={trailer}")

    tetml = tet.get_tetml(doc, "")

    out_fp = BytesIO()
    out_fp.write(tetml)
    return out_fp

@app.route('/tet-convert', methods=['POST'])
def convert_tet():
    # --1) Request the file data sent in the POST request.
    data = request.get_data()

    cropped_data = limit_pdf(data, config.getint('max_pages', fallback=None))

    # --2) Get the StringIO object from pdfminer.
    tetml_data = run_tet_xml(cropped_data)

    # --3) Get the StringIO object from freki.
    freki_data = tetml_to_freki(StringIO(tetml_data.getvalue().decode('utf-8')))

    # --4) Return the converted freki document.
    # return freki_data.getvalue()
    return freki_data.getvalue()

if __name__ == '__main__':
    with open('/Users/rgeorgi/Downloads/NWNLP2018_paper_1.pdf', 'rb') as f:
        run_pdftotext(f.read())
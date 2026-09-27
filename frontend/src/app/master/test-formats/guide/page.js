'use client';

/* eslint-disable @next/next/no-img-element -- plain screenshots from /public/guide */

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Lightbulb, TriangleAlert, Info, BookOpen } from 'lucide-react';
import styles from './guide.module.css';

const IMG = '/guide/test-formats';

const SECTIONS = [
  ['what', 'What is a Test Format?'],
  ['types', 'Which report type should I use?'],
  ['screen', 'Open the Test Format screen'],
  ['buttons', 'The buttons at the top'],
  ['table', 'Make a TABLE report'],
  ['simple', '  • A simple test (one result)'],
  ['ranges', '  • Normal ranges and H / L flags'],
  ['age', '  • Different ranges by age'],
  ['heading', '  • Group heading and indent'],
  ['text', '  • Text result'],
  ['dropdown', '  • Dropdown result'],
  ['formula', '  • Formula (calculated) result'],
  ['more', '  • Decimals, bold, hide, move, delete'],
  ['notes', '  • Notes under the results'],
  ['narrative', 'Make a NARRATIVE report'],
  ['new', 'Make a format for a new test'],
  ['preview', 'See how it will print (Preview)'],
  ['original', 'Old Word template and History'],
  ['checked', 'Save and Mark Checked'],
  ['after', 'After the format: Entry, Approval, Print'],
  ['faq', 'Common mistakes and questions'],
];

function Shot({ src, caption, small, onZoom }) {
  return (
    <figure className={`${styles.shot} ${small ? styles.shotSmall : ''}`}>
      <img src={`${IMG}/${src}`} alt={caption} loading="lazy" onClick={() => onZoom(`${IMG}/${src}`)} />
      <figcaption>{caption} <span style={{ opacity: 0.7 }}>(click to enlarge)</span></figcaption>
    </figure>
  );
}

const Tip = ({ children }) => <div className={styles.tip}><Lightbulb size={17} style={{ flexShrink: 0, marginTop: 2 }} /><div>{children}</div></div>;
const Warn = ({ children }) => <div className={styles.warn}><TriangleAlert size={17} style={{ flexShrink: 0, marginTop: 2 }} /><div>{children}</div></div>;
const Note = ({ children }) => <div className={styles.note}><Info size={17} style={{ flexShrink: 0, marginTop: 2 }} /><div>{children}</div></div>;

export default function TestFormatGuide() {
  const [zoom, setZoom] = useState(null);
  const shot = (src, caption, small) => <Shot src={src} caption={caption} small={small} onZoom={setZoom} />;

  return (
    <>
      <div className={styles.topBar}>
        <Link href="/master/test-formats" className={styles.backLink}><ArrowLeft size={16} /> Back to Test Format</Link>
      </div>

      <div className={styles.page}>
        <nav className={styles.toc}>
          <h3>Contents</h3>
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} style={label.startsWith('  ') ? { paddingLeft: 18, fontSize: 12.5 } : undefined}>{label.trim()}</a>
          ))}
        </nav>

        <article className={styles.content}>
          <h1><BookOpen size={24} style={{ verticalAlign: '-3px', marginRight: 8 }} />Test Format - User Guide</h1>
          <p className={styles.lead}>
            How to set up the report of every test, so that reports are made from the database - no Word template to choose.
            Written for lab staff. Every step has a picture.
          </p>

          {/* ------------------------------------------------------------------ */}
          <h2 id="what">What is a Test Format?</h2>
          <p>A <strong>Test Format</strong> tells the system how the report of one test looks:</p>
          <ul>
            <li>which results are entered (for example Haemoglobin, WBC Count ...),</li>
            <li>their <strong>unit</strong> and <strong>normal range</strong>,</li>
            <li>or, for USG / X-ray, the <strong>default report text</strong>.</li>
          </ul>
          <p>Every test has <strong>one</strong> format. It is the same for all doctors - the name and signature of the doctor are added when the report is approved.</p>
          <Note>
            The formats were copied automatically from the old Word templates. Please open each test once, check it, correct it if needed,
            and press <strong>Mark Checked</strong>. Tests marked <strong>Check</strong> need your attention first.
          </Note>

          {/* ------------------------------------------------------------------ */}
          <h2 id="types">Which report type should I use?</h2>
          <div className={styles.cards}>
            <div className={styles.typeCard}>
              <strong>Table</strong>
              A list of results with unit and normal range. The system marks high (H) and low (L) values.
              <div style={{ marginTop: 6 }}><em>Use for:</em> CBC, LFT, KFT, Lipid Profile, Sugar, Thyroid, Urine Routine, Widal ...</div>
              <a href="#table">How to make it →</a>
            </div>
            <div className={styles.typeCard}>
              <strong>Narrative</strong>
              A written report, like a letter. The doctor changes the text for each patient.
              <div style={{ marginTop: 6 }}><em>Use for:</em> USG, X-ray, Echo, ECG, Histopathology, FNAC ...</div>
              <a href="#narrative">How to make it →</a>
            </div>
          </div>

          <p>In a Table report, each result (parameter) also has a <strong>Result type</strong>:</p>
          <table className={styles.table}>
            <thead>
              <tr><th>Result type</th><th>What is typed</th><th>Example</th><th>H / L flag</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>Number</strong></td><td>A number</td><td>Haemoglobin 13.5, Sugar 110</td><td>Yes</td></tr>
              <tr><td><strong>Text</strong></td><td>Any words</td><td>Quantity &quot;50 ml&quot;, Remark</td><td>No</td></tr>
              <tr><td><strong>Dropdown</strong></td><td>One answer from a list (or type another)</td><td>Colour: Pale Yellow / Yellow; Protein: Absent / Trace / Present</td><td>No</td></tr>
              <tr><td><strong>Formula</strong></td><td>Nothing - it is calculated</td><td>VLDL = Triglyceride ÷ 5, Globulin = Total Protein − Albumin</td><td>Yes</td></tr>
            </tbody>
          </table>

          {/* ------------------------------------------------------------------ */}
          <h2 id="screen">Open the Test Format screen</h2>
          <ol className={styles.steps}>
            <li>In the left menu, click <strong>Master</strong>, then <strong>Test Format</strong>.</li>
            <li>Type a test name or code in the search box (for example <code>CBC</code>, <code>haemogram</code> or <code>T0000118</code>).</li>
            <li>Click the test. Its format opens on the right.</li>
          </ol>
          {shot('01-screen.png', 'The Test Format screen: tests on the left, the format of the chosen test on the right')}

          <h3>The filters and labels in the list</h3>
          {shot('02-list.png', 'Filters above the list, and a label on every test', true)}
          <table className={styles.table}>
            <tbody>
              <tr><td><strong>Check karein</strong></td><td>Copied from Word, but something may be wrong - look at these first.</td></tr>
              <tr><td><strong>Not checked</strong></td><td>Nobody has marked the format as checked yet.</td></tr>
              <tr><td><strong>Checked</strong></td><td>A staff member looked at it and marked it correct.</td></tr>
              <tr><td><strong>Table / Narrative</strong></td><td>Only tests of that report type.</td></tr>
              <tr><td><strong>No format</strong></td><td>The test has no format yet (it had no Word template). See <a href="#new">Make a format for a new test</a>.</td></tr>
            </tbody>
          </table>
          <Tip>When you type in the search box, all tests are searched - the filter is ignored.</Tip>

          {/* ------------------------------------------------------------------ */}
          <h2 id="buttons">The buttons at the top</h2>
          {shot('04-toolbar.png', 'Test name, its labels and the buttons')}
          <table className={styles.table}>
            <tbody>
              <tr><td><strong>Preview</strong></td><td>Shows how the report will print, with a sample patient. <a href="#preview">More</a></td></tr>
              <tr><td><strong>Original</strong></td><td>Shows the old Word template this format was copied from. <a href="#original">More</a></td></tr>
              <tr><td><strong>History</strong></td><td>Earlier saved versions - you can load an old one back.</td></tr>
              <tr><td><strong>Mark Checked</strong></td><td>Tick when the format is correct. Your name and the time are kept.</td></tr>
              <tr><td><strong>Save</strong> (Ctrl + S)</td><td>Saves your changes. It is grey when nothing has changed.</td></tr>
            </tbody>
          </table>
          <Warn>&quot;● Unsaved changes&quot; means you changed something and did not save yet. If you open another test, the system asks before throwing your changes away.</Warn>

          {/* ------------------------------------------------------------------ */}
          <h2 id="table">Make a TABLE report</h2>
          <p>Example: <strong>COMPLETE HAEMOGRAM (CBC)</strong>.</p>
          {shot('03-table-report.png', 'A Table report: the yellow box lists what to check after the copy from Word')}
          <ol className={styles.steps}>
            <li>Set <strong>Report Type</strong> to <strong>Table (parameters)</strong>.</li>
            <li>Type the <strong>Specimen</strong> if you want it printed (for example <code>Serum</code>, <code>EDTA whole blood</code>).</li>
            <li>Check every parameter box (next part of this guide). Use <strong>+ Add Parameter</strong> at the bottom for a new result, or the <strong>+</strong> on a row to add one just below it.</li>
            <li>Check the notes printed under the results.</li>
            <li>Press <strong>Preview</strong>, then <strong>Save</strong>, then <strong>Mark Checked</strong>.</li>
          </ol>

          <h3>One parameter box</h3>
          {shot('05-parameter.png', 'One parameter: name, method, unit, result type, printed range and the range table')}
          <table className={styles.table}>
            <tbody>
              <tr><td><strong>Parameter</strong></td><td>Name printed on the report, e.g. <code>Haemoglobin</code>.</td></tr>
              <tr><td><strong>Method</strong></td><td>Optional. Printed small under the name, e.g. <code>Diazo Method</code>.</td></tr>
              <tr><td><strong>Unit</strong></td><td>e.g. <code>gm/dl</code>, <code>mg/dl</code>, <code>%</code>, <code>/µl</code>.</td></tr>
              <tr><td><strong>Result type</strong></td><td>Number, Text, Dropdown or Formula - see <a href="#types">the table above</a>.</td></tr>
              <tr><td><strong>Printed reference range</strong></td><td>The range <em>as it is printed</em> on the report. Type it exactly as you want the patient to read it.</td></tr>
              <tr><td><strong>Range table</strong> (Sex, Age, Low, High ...)</td><td>The numbers the system uses to mark <strong>H</strong> and <strong>L</strong>. They are not printed.</td></tr>
            </tbody>
          </table>
          <Note>The <strong>printed range</strong> and the <strong>range table</strong> are separate on purpose: the printed text can say anything (&quot;Desirable &lt; 200&quot;), the table holds the numbers for the flag. Keep both in agreement.</Note>

          <h3 id="simple">A simple test (one result)</h3>
          <p>Example: <strong>SUGAR FASTING</strong> - one number with one normal range.</p>
          {shot('11-simple.png', 'Blood Glucose (Fasting): unit mg/dl, range 60 - 110 for all patients')}
          <ol className={styles.steps}>
            <li>Parameter: <code>Blood Glucose ( Fasting )</code>, Unit: <code>mg/dl</code>, Result type: <strong>Number</strong>.</li>
            <li>Printed reference range: <code>60 - 110</code>.</li>
            <li>In the range table: Sex <strong>All</strong>, leave the age boxes empty, Low <code>60</code>, High <code>110</code>.</li>
            <li>Save.</li>
          </ol>

          <h3 id="ranges">Normal ranges and H / L flags</h3>
          <ul>
            <li>Click <strong>+ Range</strong> to add a line. Remove a line with the <strong>×</strong>.</li>
            <li><strong>Sex</strong>: <em>All</em>, <em>Male</em> or <em>Female</em>. For Haemoglobin add one Male line (13 - 18) and one Female line (11 - 16).</li>
            <li>Only an upper limit, like <code>&lt; 20</code>? Leave <strong>Low</strong> empty and type <code>20</code> in <strong>High</strong>. Only a lower limit (<code>&gt; 60</code>)? Fill only Low.</li>
            <li><strong>Panic low / Panic high</strong> (optional): critical values. In Report Entry such a result turns red, so the doctor is told at once.</li>
            <li>No numbers at all (e.g. only &quot;Negative&quot;)? Leave the range table empty - there will be no H / L flag.</li>
          </ul>
          <Warn>Boxes turn <strong>red</strong> when they hold something that is not a number. Low must not be more than High. The system will not save until this is fixed.</Warn>

          <h3 id="age">Different ranges by age (children, newborn)</h3>
          <p>Example: Haemoglobin of a child up to 1 year is 10 - 14.</p>
          {shot('06-age-range.png', 'A third line: All, age 0 to 1 Years, Low 10, High 14')}
          <ol className={styles.steps}>
            <li>Click <strong>+ Range</strong>.</li>
            <li>Sex <strong>All</strong> (or Male / Female if it differs).</li>
            <li>Age from <code>0</code>, Age to <code>1</code>, Age in <strong>Years</strong>. For newborns use <strong>Days</strong> (e.g. 0 to 30 Days), for babies <strong>Months</strong>.</li>
            <li>Type Low and High, then Save.</li>
          </ol>
          <Note>
            How the system picks the range for a patient: first a line that matches <strong>age and sex</strong>, then one that matches <strong>age</strong> (sex All),
            then one that matches <strong>sex</strong> (no age), and last the <strong>All</strong> line. So an adult never gets the child range.
            &quot;Age to&quot; is included: 0 to 1 Years covers a child of exactly 1 year.
          </Note>

          <h3 id="heading">Group heading and indent</h3>
          <p>Example: <strong>DIFFERENTIAL COUNT</strong> in CBC, with Neutrophil, Lymphocyte ... under it.</p>
          {shot('07-heading.png', 'A group heading, and a parameter moved in under it')}
          <ol className={styles.steps}>
            <li>Click <strong>Add Group Heading</strong> at the bottom (or use the up / down arrows to move it to the right place).</li>
            <li>Type the heading, e.g. <code>DIFFERENTIAL COUNT</code>. It prints in capital bold letters.</li>
            <li>On each parameter that belongs to the group, click <strong>Indent more</strong> (the arrow pointing right). It moves in under the heading.</li>
            <li>The first parameter after the group: click <strong>Indent less</strong> so it is not inside the group.</li>
          </ol>

          <h3 id="text">Text result</h3>
          {shot('13-text.png', 'Quantity - a Text result with a default answer')}
          <p>Choose Result type <strong>Text</strong>. A <strong>Default value</strong> box appears: this answer is filled in automatically in Report Entry (the staff can change it).</p>

          <h3 id="dropdown">Dropdown result</h3>
          <p>Example: <strong>URINE ROUTINE</strong> - Colour, Appearance, Protein ...</p>
          {shot('12-dropdown.png', 'Colour - a Dropdown with its choices, one per line')}
          <ol className={styles.steps}>
            <li>Result type: <strong>Dropdown</strong>.</li>
            <li>In <strong>Dropdown choices</strong> type every answer on its own line, e.g. <code>Absent</code> ⏎ <code>Trace</code> ⏎ <code>Present</code>.</li>
            <li><strong>Default value</strong>: the usual answer, e.g. <code>Absent</code>.</li>
          </ol>
          <Tip>In Report Entry the staff can still type an answer that is not in the list.</Tip>

          <h3 id="formula">Formula (calculated) result</h3>
          <p>Example: <strong>VLDL CHOLESTEROL</strong> in Lipid Profile = Triglyceride ÷ 5.</p>
          {shot('14-formula.png', 'Result type Formula, and the formula [TRIGLYCERIDE] / 5')}
          <ol className={styles.steps}>
            <li>Result type: <strong>Formula</strong>.</li>
            <li>In <strong>Formula</strong> write the other parameter names in square brackets, with <code>+ - * /</code> and brackets. Examples:
              <ul>
                <li><code>[TRIGLYCERIDE] / 5</code></li>
                <li><code>[Total Protein] - [Albumin]</code> (Globulin)</li>
                <li><code>[Albumin] / [Globulin]</code> (A : G ratio)</li>
                <li><code>[TOTAL CHOLESTEROL] - [HDL DIRECT] - [VLDL CHOLESTEROL]</code></li>
              </ul>
            </li>
            <li>The name in brackets must be the parameter name of the same test (capital / small letters and spaces do not matter).</li>
            <li>Add a range line if the result should get H / L.</li>
          </ol>
          <Note>In Report Entry the formula box fills itself as soon as the other results are typed. It stays empty while a result it needs is missing.</Note>

          <h3 id="more">Decimals, bold, hide, move, delete</h3>
          <table className={styles.table}>
            <tbody>
              <tr><td><strong>Decimals</strong> (next to + Range)</td><td>How many digits after the point are printed. Empty = automatic (as many as the range, e.g. 13.0 → 1).</td></tr>
              <tr><td><strong>B</strong> (bold)</td><td>The row prints in bold, e.g. for a main result.</td></tr>
              <tr><td><strong>Eye</strong></td><td>Hide a parameter from new reports without deleting it.</td></tr>
              <tr><td><strong>↑ ↓</strong></td><td>Move the row up or down - the report prints in this order.</td></tr>
              <tr><td><strong>+</strong></td><td>Add a new parameter just below this row.</td></tr>
              <tr><td><strong>Bin</strong></td><td>Delete the row (it is gone after Save; History can bring it back).</td></tr>
            </tbody>
          </table>

          <h3 id="notes">Notes under the results</h3>
          <p>
            The box <strong>Notes printed under the results</strong> is for method, interpretation or remarks (e.g. &quot;Test done by fully automated analyser&quot;).
            Use the small toolbar for <strong>bold</strong>, <em>italic</em>, underline and lists. Delete lines that should not print - for example old remarks copied from Word
            like &quot;DRAWN SAMPLE FROM OUTSIDE&quot;.
          </p>

          {/* ------------------------------------------------------------------ */}
          <h2 id="narrative">Make a NARRATIVE report (USG, X-ray, Echo)</h2>
          <p>Example: <strong>USG OF WHOLE ABDOMEN (MALE)</strong>.</p>
          {shot('15-narrative.png', 'A Narrative report: the normal report text in a Word-like editor')}
          <ol className={styles.steps}>
            <li>Set <strong>Report Type</strong> to <strong>Narrative (report text)</strong>.</li>
            <li>In <strong>Report text</strong> type (or correct) the <strong>normal</strong> report - the text that is right for most patients.</li>
            <li>Where a measurement must be filled in, write <code>0.00</code>, e.g. <code>Liver span = 0.00 cm</code>. Places that still show 0.00 are marked yellow in <strong>Preview</strong>, so they are not forgotten.</li>
            <li>Use the toolbar for headings in <strong>bold</strong> / <u>underline</u>, lists and centred text.</li>
            <li>Preview, Save, Mark Checked.</li>
          </ol>
          <Tip>Do not type the doctor&apos;s name or signature in the text - they are added from the doctor chosen at approval.</Tip>

          {/* ------------------------------------------------------------------ */}
          <h2 id="new">Make a format for a new test</h2>
          <p>
            Some tests had no Word template, so they have no format (filter <strong>No format</strong>). When you open such a test,
            the system <strong>fills in a sample format for you</strong> - chosen from the test&apos;s name and department. You only correct it and press <strong>Create Format</strong>.
          </p>
          {shot('16-no-format.png', "DIGITAL KUB (X-RAY): the sample was copied from the lab's own KUB (X-RAY) format")}

          <h3>Which sample do I get?</h3>
          <table className={styles.table}>
            <thead><tr><th>Kind of test</th><th>Sample filled in</th></tr></thead>
            <tbody>
              <tr><td>A test with almost the same name already has a format (e.g. <em>DIGITAL KUB (X-RAY)</em> and <em>KUB (X-RAY)</em>)</td><td>That format is copied - the lab&apos;s own wording.</td></tr>
              <tr><td>Profile / package (e.g. Executive Health Profile)</td><td>The formats of all its tests, each under its own heading. Report-type tests (ECG, X-ray, USG) stay separate reports.</td></tr>
              <tr><td>X-ray</td><td>Findings for that body part (chest, spine, joint, KUB, sinus, contrast study) and an impression.</td></tr>
              <tr><td>USG, Doppler, Echo, ECG, Holter, CT</td><td>Organ / vessel findings with 0.00 measurements, and an impression.</td></tr>
              <tr><td>NCV, EMG, EEG, VEP, BAER</td><td>A table of nerves / muscles with 0.00 values, and an impression.</td></tr>
              <tr><td>Endoscopy, colonoscopy</td><td>Procedure, findings, biopsy, impression.</td></tr>
              <tr><td>Culture / BACTEC</td><td>Result, organism and an antibiotic sensitivity table.</td></tr>
              <tr><td>Histopathology, PAP, FNAC, IHC, karyotype</td><td>Specimen, gross, microscopy, impression (or a marker table).</td></tr>
              <tr><td>Antibody / antigen (IgG, IgM, ANA ...)</td><td>Result dropdown Negative / Positive / Equivocal, and an index value.</td></tr>
              <tr><td>PCR, NAAT, DNA / RNA</td><td>Dropdown Not Detected / Detected (viral load: value in IU/mL).</td></tr>
              <tr><td>Gram / AFB / KOH stain</td><td>Result as text with the usual normal answer.</td></tr>
              <tr><td>Vitamins, hormones, markers (about 50 common ones)</td><td>Unit and a usual adult range.</td></tr>
              <tr><td>24-hour urine, body fluids</td><td>Urine volume + result, or the fluid parameters.</td></tr>
              <tr><td>Anything else</td><td>One result named after the test - fill in unit and range.</td></tr>
            </tbody>
          </table>
          {shot('17-sample-serology.png', 'CYSTICERCOSIS: a serology sample - result dropdown and index value')}
          {shot('19-sample-profile.png', 'EXECUTIVE HEALTH PROFILE: built from the formats of its tests')}

          <h3>Steps</h3>
          <ol className={styles.steps}>
            <li>Click the filter <strong>No format</strong> and open a test. The blue box tells you where the sample came from.</li>
            <li>Not the right start? Click a <strong>similar test</strong> in the blue box to copy its format, type any test code in <strong>Copy from any test</strong> and press <strong>Copy</strong>, or press <strong>Blank</strong> for an empty format.</li>
            <li>Correct the sample: names, units, ranges, report text. <strong>Units and ranges are samples</strong> - use the values of your kit insert and your doctors.</li>
            <li>Press <strong>Preview</strong> to check how it prints.</li>
            <li>Press <strong>Create Format</strong>. From now on every report of this test uses this format.</li>
          </ol>
          <Warn>Nothing is saved until you press <strong>Create Format</strong>. A sample that is not saved is not used for reports.</Warn>

          {/* ------------------------------------------------------------------ */}
          <h2 id="preview">See how it will print (Preview)</h2>
          {shot('08-preview.png', 'Preview: the new report layout with a sample patient and made-up values')}
          <ul>
            <li>Press <strong>Preview</strong> at any time - unsaved changes are shown too.</li>
            <li>Change <strong>Sex</strong> and <strong>Age</strong> at the top to see which range is used for such a patient.</li>
            <li><strong>Show H / L</strong> puts one high and one low sample value, to show how flags print. Untick it for all-normal values.</li>
            <li>The values, patient and dates are samples - the word SAMPLE is printed across the page.</li>
          </ul>

          {/* ------------------------------------------------------------------ */}
          <h2 id="original">Old Word template and History</h2>
          <h3>Original</h3>
          {shot('09-original.png', 'Original: the Word template the format was copied from')}
          <p>Compare the format with the old template. Some templates held several reports or old patient values - the yellow box on the format says what was done.</p>
          <h3>History</h3>
          {shot('10-history.png', 'History: every import and every save is kept')}
          <p>Made a mistake? Open <strong>History</strong>, click <strong>Load this version</strong> on an older version, check it, and press <strong>Save</strong>. Or press <strong>Discard</strong> to go back to the current one.</p>

          {/* ------------------------------------------------------------------ */}
          <h2 id="checked">Save and Mark Checked</h2>
          <ol className={styles.steps}>
            <li>Press <strong>Save</strong> (or Ctrl + S). A format saved by staff is never overwritten by a new import from Word.</li>
            <li>When the whole format is right, press <strong>Mark Checked</strong>. The test moves out of &quot;Check karein&quot; / &quot;Not checked&quot;.</li>
            <li>Changed your mind? Click <strong>Checked</strong> again to take the tick back.</li>
          </ol>
          <Note>Marking checked is for your own tracking - reports can be made from any format, checked or not. Start with the tests the lab does most (CBC, Sugar, LFT, KFT, Lipid, Thyroid, Urine).</Note>

          {/* ------------------------------------------------------------------ */}
          <h2 id="after">After the format: Report Entry, Approval, Print</h2>
          {shot('18-report-entry.png', 'Report Entry: the format gives the boxes - a high value turns red with H')}
          <ol className={styles.steps}>
            <li><strong>Report/Query → Report Entry</strong>: choose the patient&apos;s test. Type the results (Enter jumps to the next box) or correct the narrative text.</li>
            <li>Choose the <strong>Reporting Doctor</strong> - only the doctors of that test&apos;s department are listed. Their name and designation are printed as the signature.</li>
            <li><strong>Upload Doctor Copy</strong> (photo or PDF of the doctor&apos;s signed sheet).</li>
            <li><strong>Submit for Approval</strong>. The report is locked now.</li>
            <li><strong>Report/Query → Report Approval</strong>: the approver compares the report with the doctor copy, checks the <strong>reporting doctor</strong> (it can still be changed) and presses <strong>Approve</strong> - or <strong>Send Back</strong> with a remark.</li>
            <li>After approval, <strong>Print</strong> prints the report in the new layout. The QR code on it lets the patient download the report.</li>
          </ol>
          <Note>A report keeps the format it was started with. If you change the Test Format later, old reports do not change. An open report shows <strong>Use latest format</strong> to switch to the new one.</Note>

          {/* ------------------------------------------------------------------ */}
          <h2 id="faq">Common mistakes and questions</h2>
          <table className={styles.table}>
            <thead><tr><th>Problem</th><th>What to do</th></tr></thead>
            <tbody>
              <tr><td>No H / L flag on a result</td><td>The range table is empty, or the result type is Text / Dropdown. Add a range line with Low / High.</td></tr>
              <tr><td>Wrong flag for women or children</td><td>Add Male / Female lines, and age lines for children. Check with <strong>Preview</strong> → Sex / Age.</td></tr>
              <tr><td>Formula stays empty</td><td>A name in [ ] does not match a parameter name, or that result is not typed yet.</td></tr>
              <tr><td>&quot;Save&quot; is grey</td><td>Nothing has changed since the last save.</td></tr>
              <tr><td>Unit or range is missing</td><td>The copy from Word could not read it. Look at <strong>Original</strong> and type it in.</td></tr>
              <tr><td>A parameter is in the wrong group</td><td>Use Indent less / Indent more and the ↑ ↓ arrows.</td></tr>
              <tr><td>Old remarks print on every report</td><td>Delete them from &quot;Notes printed under the results&quot;.</td></tr>
              <tr><td>Test is not in Report Entry with a format</td><td>It has no format yet - see <a href="#new">Make a format for a new test</a>.</td></tr>
            </tbody>
          </table>
        </article>
      </div>

      {zoom && (
        <div className={styles.zoomBackdrop} onClick={() => setZoom(null)}>
          <img src={zoom} alt="Screenshot" />
        </div>
      )}
    </>
  );
}

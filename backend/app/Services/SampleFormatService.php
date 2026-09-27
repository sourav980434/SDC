<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * A ready-made starting format for a test that has none yet (no Word template was imported).
 * Picked from the test's name and department: profiles are built from their component tests,
 * imaging / neurology / endoscopy / culture / histopathology get a narrative outline, serology and
 * PCR a result dropdown, and common analytes a unit with a usual adult range.
 *
 * Nothing is saved here - the Test Format Master shows the sample, the lab corrects it and saves.
 * All ranges are SAMPLES: the lab must check them against its own kit inserts.
 */
class SampleFormatService
{
    /** Sample format + where it came from: ['format', 'parameters', 'source', 'note', 'similar']. */
    public static function suggest(string $testCode): array
    {
        $test = DB::table('MTest as t')
            ->leftJoin('MDepartment as d', 't.DeptCode', '=', 'd.Code')
            ->where('t.Code', $testCode)
            ->first(['t.Code', 't.Descr', 't.Profile', 'd.Descr as dept']);
        $name = trim((string) ($test->Descr ?? ''));
        $dept = strtoupper(trim((string) ($test->dept ?? '')));
        $upper = strtoupper($name);

        $similar = self::similar($testCode, $name);
        $result = self::profile($testCode)
            ?? self::copyOf($similar[0] ?? null)
            ?? self::imaging($upper, $dept, $name)
            ?? self::pathology($upper, $name)
            ?? self::generic($name);

        $result['similar'] = $similar;
        return $result;
    }

    /**
     * A test with (almost) the same name already has a format - "DIGITAL SCAPULA AP/LAT" and
     * "SCAPULA AP/LAT": the lab's own wording is a better start than a generic outline.
     */
    private static function copyOf(?array $best): ?array
    {
        if (!$best || $best['score'] < 0.8) {
            return null;
        }
        $data = TestFormatService::get($best['code']);
        if (!$data) {
            return null;
        }
        $f = $data['format'];
        // A near-empty format (the Word template had no usable text) is no help - use an outline instead
        $text = trim(html_entity_decode(strip_tags((string) $f['narrative_html']), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $hasParams = (bool) array_filter($data['parameters'], fn ($p) => $p['row_type'] === 'PARAM');
        if ($f['format_type'] === 'NARRATIVE' ? mb_strlen(trim($text, " -\xc2\xa0")) < 40 : !$hasParams) {
            return null;
        }
        $parameters = array_map(function ($p) {
            unset($p['id'], $p['test_code'], $p['sort_order']);
            $p['ranges'] = array_map(fn ($r) => array_diff_key($r, ['id' => 1, 'parameter_id' => 1]), $p['ranges']);
            return $p;
        }, $data['parameters']);

        return self::fmt($f['format_type'], $parameters, $f['narrative_html'], $f['specimen'], $f['notes_html'])
            + self::src('Similar test', "Copied from the format of \"{$best['name']}\" ({$best['code']}) - a test with nearly the same name. Check that it fits this test.");
    }

    // ------------------------------------------------------------------ helpers

    private static function fmt(string $type, array $parameters = [], ?string $narrative = null, ?string $specimen = null, ?string $notes = null): array
    {
        return [
            'format' => ['format_type' => $type, 'specimen' => $specimen, 'notes_html' => $notes, 'narrative_html' => $narrative],
            'parameters' => $parameters,
        ];
    }

    /**
     * One parameter. $ranges: [['A'|'M'|'F', low, high], ...] (null for an open side),
     * or with an age window: ['A', low, high, ageFrom, ageTo, 'Y'|'M'|'D'].
     */
    private static function p(string $name, ?string $unit = null, ?string $ref = null, array $ranges = [], string $type = 'NUMERIC', array $extra = []): array
    {
        return array_merge([
            'row_type' => 'PARAM',
            'name' => $name,
            'method' => null,
            'unit' => $unit,
            'result_type' => $type,
            'options' => null,
            'default_value' => null,
            'ref_text' => $ref,
            'decimals' => null,
            'formula' => null,
            'indent' => 0,
            'is_bold' => false,
            'is_active' => true,
            'ranges' => array_map(fn ($r) => [
                'sex' => $r[0], 'low' => $r[1], 'high' => $r[2],
                'age_from' => $r[3] ?? null, 'age_to' => $r[4] ?? null, 'age_unit' => $r[5] ?? 'Y',
                'panic_low' => null, 'panic_high' => null,
            ], $ranges),
        ], $extra);
    }

    private static function heading(string $name, int $indent = 0): array
    {
        return self::p($name, null, null, [], 'NUMERIC', ['row_type' => 'HEADING', 'is_bold' => true, 'indent' => $indent]);
    }

    private static function choice(string $name, array $options, ?string $ref = null, ?string $default = null): array
    {
        return self::p($name, null, $ref, [], 'OPTIONS', ['options' => implode("\n", $options), 'default_value' => $default ?? $options[0]]);
    }

    private static function text(string $name, ?string $default = null, ?string $ref = null): array
    {
        return self::p($name, null, $ref, [], 'TEXT', ['default_value' => $default]);
    }

    private static function has(string $haystack, string $pattern): bool
    {
        return (bool) preg_match('/' . $pattern . '/i', $haystack);
    }

    /** "DIGITAL CHEST PA" -> "CHEST PA"; "USG OF SINGLE PAROTID" -> "SINGLE PAROTID". */
    private static function part(string $name): string
    {
        $part = preg_replace('/\s+/', ' ', $name);
        $part = preg_replace('/\b(DIGITAL|X[\s-]?RAY|USG( OF)?|ULTRASONOGRAPHY( OF)?|DOPPLER STUDY( OF)?|POWER DOPPLER( OF)?|COLOU?R DOPPLER( OF)?|DOPPLER|STUDY)\b/i', '', $part);
        $part = trim(preg_replace('/\s+/', ' ', str_replace(['( ', ' )', '()'], ['(', ')', ''], $part)), " -");
        $part = preg_replace('/^OF\s+/i', '', $part);
        return $part !== '' ? $part : $name;
    }

    private static function html(array $blocks): string
    {
        $out = '';
        foreach ($blocks as $b) {
            if (is_array($b)) {   // [heading, text]
                $out .= '<p><b><u>' . e($b[0]) . '</u></b></p><p>' . e($b[1]) . '</p>';
            } else {
                $out .= '<p>' . e($b) . '</p>';
            }
        }
        return $out;
    }

    private static function title(string $text): string
    {
        return '<p style="text-align:center"><b><u>' . e(strtoupper($text)) . '</u></b></p>';
    }

    // ------------------------------------------------------------------ profiles

    /** A profile / package: the formats of its component tests, each under its own heading. */
    private static function profile(string $testCode): ?array
    {
        $components = DB::table('MTestDTL as x')
            ->leftJoin('MTest as t', 'x.TestCode', '=', 't.Code')
            ->where('x.PTestCode', $testCode)
            ->orderBy('x.SrlNo')
            ->get(['x.TestCode', 't.Descr']);
        if ($components->isEmpty()) {
            return null;
        }

        $parameters = [];
        $separate = [];
        $missing = [];
        foreach ($components as $c) {
            $code = trim((string) $c->TestCode);
            $compName = trim((string) $c->Descr) ?: $code;
            $data = TestFormatService::get($code);
            if (!$data) {
                $missing[] = $compName;
                continue;
            }
            if ($data['format']['format_type'] !== 'TABLE') {
                $separate[] = $compName;
                continue;
            }
            $parameters[] = self::heading($compName);
            foreach ($data['parameters'] as $p) {
                if ($p['row_type'] === 'HEADING' && strcasecmp(trim($p['name']), $compName) === 0) {
                    continue;
                }
                unset($p['id'], $p['test_code'], $p['sort_order']);
                $p['indent'] = min(3, (int) $p['indent'] + 1);
                $p['ranges'] = array_map(fn ($r) => array_diff_key($r, ['id' => 1, 'parameter_id' => 1]), $p['ranges']);
                $parameters[] = $p;
            }
        }
        if (!array_filter($parameters, fn ($p) => $p['row_type'] === 'PARAM')) {
            return null;
        }

        $note = 'Built from the ' . count($components) . ' tests of this profile - each test is a group with its own parameters and ranges.';
        if ($separate) {
            $note .= ' Report-type tests are made as separate reports: ' . implode(', ', $separate) . '.';
        }
        if ($missing) {
            $note .= ' No format yet for: ' . implode(', ', $missing) . '.';
        }
        return self::fmt('TABLE', $parameters) + ['source' => 'Profile', 'note' => $note];
    }

    // ------------------------------------------------------------------ imaging / clinical reports

    private static function imaging(string $u, string $dept, string $name): ?array
    {
        $part = self::part($name);
        $isXray = self::has($dept, 'X.?RAY') || self::has($u, 'X[\s-]?RAY|\b(AP|PA|LAT|OBL|VIEW)\b|TOWNS|IVP|I\.V\.P|HSG|MCU|RGU|BARIUM|CHOL(I)?ANG');

        if (self::has($u, '\bNCV\b|\bNCS\b|NERVE CONDUCTION')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::nerveTable(self::has($u, 'EMG'))
                . self::html([['IMPRESSION :', 'Nerve conduction study is within normal limits.']])) + self::src('Neurology', 'Nerve conduction table - fill in the measured values (0.00) and the nerves tested.');
        }
        if (self::has($u, '\bEMG\b')) {
            return self::fmt('NARRATIVE', [], self::title($name) . '<table><tr><th>Muscle</th><th>Insertional activity</th><th>Spontaneous activity</th><th>MUAP</th><th>Recruitment</th></tr>'
                . '<tr><td>&nbsp;</td><td>Normal</td><td>Absent</td><td>Normal</td><td>Full</td></tr><tr><td>&nbsp;</td><td>Normal</td><td>Absent</td><td>Normal</td><td>Full</td></tr></table>'
                . self::html([['IMPRESSION :', 'Electromyography of the muscles studied is within normal limits.']])) + self::src('Neurology', 'EMG table - write the muscles studied and the findings.');
        }
        if (self::has($u, '\bEEG\b')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                ['RECORDING :', 'Routine EEG recorded in awake and drowsy state with standard 10-20 electrode placement.'],
                ['BACKGROUND :', 'Posterior dominant alpha rhythm of 0.00 Hz, symmetrical and reactive to eye opening.'],
                ['ACTIVATION :', 'Hyperventilation and photic stimulation did not produce any abnormality.'],
                ['IMPRESSION :', 'Normal awake and drowsy EEG record.'],
            ])) + self::src('Neurology', 'EEG report outline.');
        }
        if (self::has($u, '\bVEP\b|\bBAER\b|\bSSEP\b|\bRNS\b|REPETITIVE|BLINK')) {
            return self::fmt('NARRATIVE', [], self::title($name) . '<table><tr><th>Side</th><th>Latency (ms)</th><th>Amplitude</th><th>Remark</th></tr>'
                . '<tr><td>Right</td><td>0.00</td><td>0.00</td><td>Normal</td></tr><tr><td>Left</td><td>0.00</td><td>0.00</td><td>Normal</td></tr></table>'
                . self::html([['IMPRESSION :', 'The study is within normal limits.']])) + self::src('Neurology', 'Evoked potential / reflex study table.');
        }
        if (self::has($u, 'ENDOSCOPY|COLONOSCOPY|SIGMOIDOSCOPY|BRONCHOSCOPY')) {
            $colon = self::has($u, 'COLON|SIGMOID');
            return self::fmt('NARRATIVE', [], self::title($name) . self::html(array_filter([
                ['PROCEDURE :', 'Performed under ' . ($colon ? 'sedation after bowel preparation' : 'local anaesthesia') . '. Scope passed up to ' . ($colon ? 'the caecum / sigmoid colon' : 'the second part of duodenum') . '.'],
                $colon ? ['FINDINGS :', 'Mucosa of the rectum and colon appears normal. No ulcer, polyp or growth seen. Vascular pattern is normal.']
                    : ['FINDINGS :', 'Oesophagus: normal. Stomach: normal mucosa, no ulcer or growth. Duodenum: normal.'],
                ['BIOPSY :', 'Not taken.'],
                ['IMPRESSION :', 'Normal study.'],
            ]))) + self::src('Endoscopy', 'Procedure, findings and impression outline.');
        }
        if (self::has($u, 'HOLTER')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                ['RECORDING :', 'Holter recording for 00 hours. Predominant rhythm: sinus rhythm.'],
                ['HEART RATE :', 'Minimum 00 bpm, maximum 00 bpm, average 00 bpm.'],
                ['ECTOPY :', 'No significant ventricular or supraventricular ectopy. No pauses.'],
                ['IMPRESSION :', 'Normal Holter study.'],
            ])) + self::src('Cardiology', 'Holter report outline.');
        }
        if (self::has($u, '\bECG\b|ELECTROCARDIO')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                'Rhythm : Sinus rhythm', 'Rate : 00 / min', 'Axis : Normal', 'PR interval : 0.00 sec', 'QRS duration : 0.00 sec', 'QT / QTc : 0.00 / 0.00 sec', 'ST - T : No significant ST - T changes',
                ['IMPRESSION :', 'ECG within normal limits.'],
            ])) + self::src('Cardiology', 'ECG report outline.');
        }
        if (self::has($u, '\bECHO|TMT|TREAD')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                ['CHAMBERS :', 'All cardiac chambers are normal in size. LVEF 00 %.'],
                ['VALVES :', 'All valves are normal in structure and function.'],
                ['OTHERS :', 'No pericardial effusion. No clot or vegetation.'],
                ['IMPRESSION :', 'Normal study.'],
            ])) + self::src('Cardiology', 'Echo / TMT report outline.');
        }
        if (self::has($u, 'DOPPLER|AORT|ARTER|VENOUS|VEIN|RETINAL ARTERY')) {
            return self::fmt('NARRATIVE', [], self::title('Doppler study of ' . $part) . self::html([
                ['ARTERIES :', 'Normal calibre with normal triphasic flow. No stenosis or thrombus. Peak systolic velocity 00 cm/sec.'],
                ['VEINS :', 'Fully compressible with normal phasic flow. No thrombus seen.'],
                ['IMPRESSION :', 'No abnormality detected in the vessels studied.'],
            ])) + self::src('Doppler', 'Vessel-wise Doppler outline - add or remove vessels.');
        }
        if (self::has($dept, 'ULTRA') || self::has($u, '\bUSG\b|ULTRASO')) {
            if (self::has($u, 'GUIDED|DRAINAGE|ASPIRATION|BIOPSY')) {
                return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                    ['PROCEDURE :', 'Under aseptic precautions and local anaesthesia, the procedure was done under ultrasound guidance.'],
                    ['FINDINGS :', '00 ml of fluid / tissue obtained and sent for examination.'],
                    ['COMPLICATIONS :', 'None. The patient tolerated the procedure well.'],
                ])) + self::src('Ultrasound', 'Guided procedure note.');
            }
            if (self::has($u, 'ELASTOGRAPHY')) {
                return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                    ['LIVER STIFFNESS :', 'Median 0.00 kPa (IQR / median 00 %).'],
                    ['IMPRESSION :', 'Liver stiffness within normal limits (F0 - F1).'],
                ])) + self::src('Ultrasound', 'Elastography outline.');
            }
            return self::fmt('NARRATIVE', [], self::title('USG of ' . $part) . self::html([
                ['FINDINGS :', 'The ' . strtolower($part) . ' is normal in size, shape and echotexture. No focal lesion, collection or calcification is seen. Measures 0.00 x 0.00 cm (approx).'],
                ['IMPRESSION :', 'No sonographic abnormality detected.'],
            ])) + self::src('Ultrasound', 'Findings and impression outline with measurements (0.00).');
        }
        if (self::has($dept, 'CT|MRI') || self::has($u, '\bCT\b|\bMRI\b')) {
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                ['TECHNIQUE :', 'Plain / contrast axial sections were taken with multiplanar reconstruction.'],
                ['FINDINGS :', 'No abnormality detected in the region studied.'],
                ['IMPRESSION :', 'Normal study.'],
            ])) + self::src('CT / MRI', 'Technique, findings and impression outline.');
        }
        if ($isXray) {
            return self::fmt('NARRATIVE', [], self::title('X-ray ' . $part) . self::xrayFindings($u)) + self::src('X-ray', 'X-ray findings for this body part, with impression - change to the actual findings.');
        }
        return null;
    }

    private static function src(string $source, string $note): array
    {
        return ['source' => $source, 'note' => $note];
    }

    private static function nerveTable(bool $withEmg): string
    {
        $motor = '<tr><td>&nbsp;</td><td>0.00</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>';
        $sensory = '<tr><td>&nbsp;</td><td>0.00</td><td>0.00</td><td>0.00</td></tr>';
        return '<p><b><u>MOTOR NERVE CONDUCTION</u></b></p><table><tr><th>Nerve</th><th>Latency (ms)</th><th>Amplitude (mV)</th><th>Velocity (m/s)</th><th>F-wave (ms)</th></tr>' . $motor . $motor . '</table>'
            . '<p><b><u>SENSORY NERVE CONDUCTION</u></b></p><table><tr><th>Nerve</th><th>Latency (ms)</th><th>Amplitude (µV)</th><th>Velocity (m/s)</th></tr>' . $sensory . $sensory . '</table>'
            . ($withEmg ? '<p><b><u>EMG</u></b></p><p>Muscles studied show normal insertional activity, no spontaneous activity and normal motor unit potentials.</p>' : '');
    }

    private static function xrayFindings(string $u): string
    {
        if (self::has($u, 'CHEST')) {
            return self::html([['FINDINGS :', 'Both lung fields are clear. Both hila are normal. Cardiac size and shape are within normal limits. Both costophrenic angles are clear. Both domes of diaphragm are normal. Bony thorax is normal.'], ['IMPRESSION :', 'No active lung lesion seen.']]);
        }
        if (self::has($u, 'SPINE|CERVICAL|DORSAL|LUMBAR|\bL\s?S\b|SACR|COCCYX')) {
            return self::html([['FINDINGS :', 'Vertebral bodies are normal in height, alignment and density. Intervertebral disc spaces are maintained. Pedicles and posterior elements are normal. No fracture or destructive lesion seen. Paravertebral soft tissues are normal.'], ['IMPRESSION :', 'No significant bony abnormality detected.']]);
        }
        if (self::has($u, 'KUB|ABDOMEN|IVP|I\.V\.P')) {
            return self::html([['FINDINGS :', 'Renal outlines are normal. No radio-opaque shadow is seen in the region of the kidneys, ureters or urinary bladder. Bowel gas pattern is normal. Psoas shadows are normal. Visualised bones are normal.'], ['IMPRESSION :', 'No radio-opaque calculus seen.']]);
        }
        if (self::has($u, 'SKULL|PNS|SINUS|MASTOID|TOWNS|NASOPHAR|ADENOID|ADINOID|MANDIBLE|JAW|FACE|ORBIT|NASAL')) {
            return self::html([['FINDINGS :', 'Paranasal sinuses / air cells are clear. Bony outlines are intact. No fracture or destructive lesion seen. Nasopharyngeal soft tissue is normal.'], ['IMPRESSION :', 'No abnormality detected.']]);
        }
        if (self::has($u, 'HSG|MCU|RGU|BARIUM|CHOL(I)?ANG|CONTRAST|FISTUL|SINOGRAM')) {
            return self::html([['PROCEDURE :', 'Contrast study done after informed consent under aseptic precautions. Plain film and serial films taken.'], ['FINDINGS :', 'Contrast opacifies the structures normally with free flow. No filling defect, stricture or leak seen.'], ['IMPRESSION :', 'Normal study.']]);
        }
        return self::html([['FINDINGS :', 'Bones show normal density and alignment. No fracture, dislocation or destructive lesion seen. Joint spaces are maintained. Soft tissues are normal.'], ['IMPRESSION :', 'No significant bony abnormality detected.']]);
    }

    // ------------------------------------------------------------------ laboratory

    private static function pathology(string $u, string $name): ?array
    {
        // Culture and sensitivity
        if (self::has($u, 'CULTURE|C\/S|BACTEC|MGIT')) {
            $afb = self::has($u, 'AFB|TB|TUBERC|BACTEC|MGIT');
            return self::fmt('NARRATIVE', [], self::title($name) . self::html(array_filter([
                ['SPECIMEN :', 'As received.'],
                $afb ? ['RESULT :', 'No growth of Mycobacterium tuberculosis after 00 days of incubation.']
                    : ['RESULT :', 'No growth after 48 hours of aerobic incubation at 37°C.'],
                $afb ? null : ['ORGANISM ISOLATED :', 'Nil'],
            ])) . ($afb ? '' : '<p><b><u>ANTIBIOTIC SENSITIVITY</u></b></p><table><tr><th>Antibiotic</th><th>Result</th><th>MIC</th></tr>'
                . '<tr><td>&nbsp;</td><td>Sensitive</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>Resistant</td><td>&nbsp;</td></tr></table>'))
                + self::src('Culture', 'Culture report outline - write the organism and the antibiotic sensitivity when there is growth.');
        }
        // Histopathology, cytology, IHC, karyotype
        if (self::has($u, 'HISTO|BIOPSY|\bPAP\b|FNAC|CYTOLOGY|CELL BLOCK|\bIHC\b|ER, PR|HER ?2|KARYO|CHROMOSOME|SLIDE|MALIGNANT CELL|SMEAR - PAP')) {
            if (self::has($u, 'KARYO|CHROMOSOME')) {
                return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                    ['SPECIMEN :', 'Peripheral blood (heparin).'], ['METAPHASES STUDIED :', '00 (GTG banding, 450 - 550 band level).'],
                    ['KARYOTYPE :', '46,XX / 46,XY'], ['INTERPRETATION :', 'Normal female / male karyotype. No numerical or structural abnormality detected.'],
                ])) + self::src('Cytogenetics', 'Karyotype report outline.');
            }
            if (self::has($u, '\bIHC\b|ER, PR|HER ?2')) {
                return self::fmt('NARRATIVE', [], self::title($name) . '<table><tr><th>Marker</th><th>Result</th><th>Intensity</th><th>% cells</th></tr>'
                    . '<tr><td>ER</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>PR</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>HER2</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></table>'
                    . self::html([['INTERPRETATION :', '']])) + self::src('Histopathology', 'IHC marker table.');
            }
            return self::fmt('NARRATIVE', [], self::title($name) . self::html([
                ['SPECIMEN :', 'As received.'],
                ['GROSS :', 'Received ...'],
                ['MICROSCOPY :', 'Sections / smears show ...'],
                ['IMPRESSION :', 'Negative for intraepithelial lesion or malignancy.'],
            ])) + self::src('Histopathology / Cytology', 'Specimen, gross, microscopy and impression outline.');
        }
        // Stains and smears
        if (self::has($u, "GRAM|\bAFB\b|Z ?N STAIN|\bKOH\b|LEISHMAN STAIN|FUNGUS|STAIN FOR|SMEAR")) {
            $default = self::has($u, 'AFB|Z ?N') ? 'No acid fast bacilli seen.'
                : (self::has($u, 'KOH|FUNG') ? 'No fungal elements seen.'
                : (self::has($u, 'EOSINOPHIL') ? 'Eosinophils not seen.' : 'No organism seen.'));
            return self::fmt('TABLE', [
                self::text('Specimen', 'As received'),
                self::text('Result', $default),
                self::text('Pus cells', 'Occasional'),
            ]) + self::src('Stain / smear', 'Result as text with the usual normal answer - change it for each patient in Report Entry.');
        }
        // PCR / molecular
        if (self::has($u, 'PCR|NAAT|\bDNA\b|\bRNA\b|VIRAL LOAD|GENOTYP|BCR.?ABL|\bHLA|MUTATION|TPMT')) {
            if (!self::has($u, 'QUALITATIVE|QUALITITIVE') && self::has($u, 'VIRAL LOAD|QUANTITATIVE|BCR.?ABL.*(QUANT|IS)')) {
                return self::fmt('TABLE', [
                    self::p($name, self::has($u, 'BCR') ? '% IS' : 'IU/mL', 'Target not detected / below limit of detection'),
                    self::choice('Interpretation', ['Not Detected', 'Detected']),
                ], null, null, '<p>Method: Real-time PCR.</p>') + self::src('Molecular', 'Quantitative PCR: value and interpretation.');
            }
            return self::fmt('TABLE', [
                self::choice($name, ['Not Detected', 'Detected'], 'Not Detected'),
            ], null, null, '<p>Method: Real-time PCR.</p>') + self::src('Molecular', 'Qualitative PCR: Not Detected / Detected.');
        }
        // Analytes with a known unit and usual range
        if ($lib = self::library($u, $name)) {
            return $lib;
        }
        // Antibodies / antigens / serology
        if (self::has($u, 'ANTI|ANTIBOD|\bAB\b|IG[GMAE]\b|IGG|IGM|IGA|\bAG\b|ANTIGEN|HAV|HBV|HCV|HDV|HBS|HBC|HBE|HIV|VDRL|TORCH|RUBEL|MEASLES|MUMPS|DENGUE|MALARIA|TYPHI|WIDAL|LEPTO|BRUCELLA|CYSTICERC|EPSTEIN|EBV|H.?PYLORI|COVID|ASCA|\bANA\b|FANA|ASMA|LKM|GBM|MUSK|SSA|SSB|NRNP|JO-1|GAD|MONOSPOT|ASPERGILL|RK ?39|KALA')) {
            $titre = self::has($u, '\bANA\b|FANA|IFA');
            return self::fmt('TABLE', array_values(array_filter([
                self::choice($name, ['Negative', 'Positive', 'Equivocal'], 'Negative'),
                $titre ? self::text('Titre') : self::p('Index value', 'Index', 'Negative: < 0.9' . "\n" . 'Equivocal: 0.9 - 1.1' . "\n" . 'Positive: > 1.1', [['A', null, 0.9]]),
                $titre ? self::text('Pattern') : null,
            ])), null, 'Serum', '<p>Method: ELISA / CLIA. Please correlate clinically.</p>')
                + self::src('Serology', 'Result dropdown and index value. The cut-off 0.9 / 1.1 is a SAMPLE - use the values of your kit insert.');
        }
        // 24-hour urine
        if (self::has($u, '24 ?HRS?|24 HOUR')) {
            $analyte = trim(preg_replace('/24 ?HRS?\.?|24 HOUR|URINE|URINARY|FOR|\(.*?\)|,.*$/i', '', $name));
            return self::fmt('TABLE', [
                self::p('Urine volume (24 hrs)', 'ml', '600 - 2000', [['A', 600, 2000]]),
                self::p(ucwords(strtolower($analyte ?: $name)) . ' (24 hrs)', null, null),
            ], null, '24 hours urine') + self::src('24-hour urine', 'Volume and the result per 24 hours - fill the unit and range of your method.');
        }
        // Body fluids
        if (self::has($u, 'FLUID')) {
            if (self::has($u, 'CELL COUNT')) {
                return self::fmt('TABLE', [
                    self::p('Total cell count', 'cells/µl'),
                    self::p('Polymorphs', '%'), self::p('Lymphocytes', '%'),
                    self::text('Other cells', 'Nil'),
                ], null, 'Body fluid') + self::src('Body fluid', 'Cell count of a body fluid.');
            }
            $unit = self::has($u, 'SUGAR|GLUCOSE') ? 'mg/dl' : (self::has($u, 'PROTEIN|PORTEIN') ? 'g/dl' : (self::has($u, 'CHLORIDE') ? 'mmol/L' : (self::has($u, 'AMYLASE') ? 'U/L' : null)));
            return self::fmt('TABLE', [self::p($name, $unit, 'Please correlate with serum value')], null, 'Body fluid')
                + self::src('Body fluid', 'Body fluid chemistry.');
        }
        // Stool screening tests
        if (self::has($u, 'STOOL|FAECAL|FECAL|OCCULT|REDUCING|CHYLE|INTERFERON|IGRA|QUANTIFERON')) {
            return self::fmt('TABLE', [self::choice($name, ['Negative', 'Positive'], 'Negative')], null, self::has($u, 'STOOL|FAECAL|FECAL|OCCULT|REDUCING') ? 'Stool' : null)
                + self::src('Screening', 'Negative / Positive result.');
        }
        if (self::has($u, 'SICKLE|OSMOTIC FRAGILITY')) {
            return self::fmt('TABLE', self::has($u, 'OSMOTIC') ? [
                self::p('Haemolysis begins at', '% NaCl', '0.45 - 0.50'),
                self::p('Complete haemolysis at', '% NaCl', '0.30 - 0.35'),
                self::choice('Interpretation', ['Normal osmotic fragility', 'Increased osmotic fragility', 'Decreased osmotic fragility']),
            ] : [self::choice($name, ['Negative', 'Positive'], 'Negative')]) + self::src('Haematology', 'Screening result.');
        }
        return null;
    }

    /** Common analytes: unit, printed range and the numbers for the flag (usual adult values - SAMPLES). */
    private static function library(string $u, string $name): ?array
    {
        $one = fn (string $unit, string $ref, array $ranges = [], ?string $specimen = 'Serum', ?string $label = null) =>
            self::fmt('TABLE', [self::p($label ?? $name, $unit, $ref, $ranges)], null, $specimen)
            + self::src('Common analyte', 'Unit and a usual adult range were filled in. The range is a SAMPLE - use the range of your kit / method.');

        $map = [
            'VITAMIN D|25 HYDROXY' => fn () => $one('ng/mL', "Deficient: < 20\nInsufficient: 20 - 29\nSufficient: 30 - 100\nToxic: > 100", [['A', 30, 100]]),
            'VITAMIN B ?12|COBALAMIN' => fn () => $one('pg/mL', '211 - 911', [['A', 211, 911]]),
            'VITAMIN B ?6' => fn () => $one('µg/L', '5 - 50', [['A', 5, 50]], 'Plasma'),
            'VITAMIN B ?1|THIAMINE' => fn () => $one('nmol/L', '70 - 180', [['A', 70, 180]], 'Whole blood'),
            'CALCITONIN' => fn () => $one('pg/mL', "Male: < 11.5\nFemale: < 4.6", [['M', null, 11.5], ['F', null, 4.6]]),
            'HOMOCYSTEINE' => fn () => $one('µmol/L', '5 - 15', [['A', 5, 15]], 'Plasma'),
            'C-PEPTIDE' => fn () => $one('ng/mL', 'Fasting: 1.1 - 4.4', [['A', 1.1, 4.4]]),
            'DHEA' => fn () => $one('µg/dL', "Male: 80 - 560\nFemale: 35 - 430", [['M', 80, 560], ['F', 35, 430]]),
            'OESTRADIOL|ESTRADIOL' => fn () => $one('pg/mL', "Male: 11 - 44\nFemale - Follicular: 12.5 - 166\nOvulation: 85.8 - 498\nLuteal: 43.8 - 211\nPost-menopause: < 54.7", [['M', 11, 44]]),
            'SHBG|SEX HORMONE BINDING' => fn () => $one('nmol/L', "Male: 18 - 54\nFemale: 18 - 144", [['M', 18, 54], ['F', 18, 144]]),
            'DHT|DIHYDROTESTOSTERONE' => fn () => $one('pg/mL', "Male: 250 - 990\nFemale: 24 - 368", [['M', 250, 990], ['F', 24, 368]]),
            'ALDOSTERONE' => fn () => $one('ng/dL', "Upright: 4 - 31\nSupine: 1 - 16"),
            'RENIN' => fn () => $one('ng/mL/hr', 'Upright: 0.5 - 3.3', [['A', 0.5, 3.3]], 'Plasma'),
            'PROLACTIN' => fn () => $one('ng/mL', "Male: 4.0 - 15.2\nFemale: 4.8 - 23.3", [['M', 4.0, 15.2], ['F', 4.8, 23.3]]),
            'IGF|GROWTH FACTOR' => fn () => $one('ng/mL', 'Depends on age and sex - see the kit insert'),
            'TRANSFERRIN' => fn () => $one('mg/dL', '200 - 360', [['A', 200, 360]]),
            'TROPONIN' => fn () => $one('ng/L', '< 14', [['A', null, 14]]),
            'ERYTHROPOIETIN' => fn () => $one('mIU/mL', '4.3 - 29', [['A', 4.3, 29]]),
            'GASTRIN' => fn () => $one('pg/mL', 'Fasting: < 100', [['A', null, 100]]),
            'URINE.*BETA ?2 MICRO' => fn () => $one('µg/L', '< 300', [['A', null, 300]], 'Urine'),
            'BETA ?2 MICRO' => fn () => $one('mg/L', '0.8 - 2.2', [['A', 0.8, 2.2]]),
            'LEAD' => fn () => $one('µg/dL', '< 5', [['A', null, 5]], 'Whole blood'),
            'LIPOPROTEIN \(?A|^LIPOPROTEIN$' => fn () => $one('mg/dL', '< 30', [['A', null, 30]]),
            'APO ?LIPOPROTEIN ?B|APO B' => fn () => $one('mg/dL', "Male: 66 - 133\nFemale: 60 - 117", [['M', 66, 133], ['F', 60, 117]]),
            'IGG4' => fn () => $one('mg/dL', '3.9 - 86.4', [['A', 3.9, 86.4]]),
            'PIVKA' => fn () => $one('mAU/mL', '< 40', [['A', null, 40]]),
            'METH ?HAEMOGLOBIN|METHEMOGLOBIN' => fn () => $one('%', '< 1.5', [['A', null, 1.5]], 'Whole blood'),
            'CALPROTECTIN' => fn () => $one('µg/g', "Normal: < 50\nBorderline: 50 - 200\nRaised: > 200", [['A', null, 50]], 'Stool'),
            'ELASTASE' => fn () => $one('µg/g', "Normal: > 200\nModerate insufficiency: 100 - 200\nSevere: < 100", [['A', 200, null]], 'Stool'),
            'INHIBIN' => fn () => $one('pg/mL', "Male: 25 - 325\nFemale: depends on cycle phase and age"),
            'ANTI ?THROMBIN' => fn () => $one('%', '80 - 120', [['A', 80, 120]], 'Citrated plasma'),
            'FACTOR XIII' => fn () => $one('%', '70 - 140', [['A', 70, 140]], 'Citrated plasma'),
            'TPO|THYROID PEROXIDASE' => fn () => $one('IU/mL', '< 34', [['A', null, 34]]),
            'TRAB|TSH RECEPTOR|THYROTROPIN RECEPTOR' => fn () => $one('IU/L', 'Negative: < 1.75', [['A', null, 1.75]]),
            'DNASE' => fn () => $one('U/mL', '< 200', [['A', null, 200]]),
            'ABSOLUTE BASOPHIL' => fn () => $one('cells/µl', '20 - 100', [['A', 20, 100]], 'EDTA whole blood'),
            'CD4 CELL' => fn () => $one('cells/µl', '500 - 1500', [['A', 500, 1500]], 'EDTA whole blood', 'CD4 count'),
            'PAPP' => fn () => $one('MoM', '0.5 - 2.0', [['A', 0.5, 2.0]]),
            'OXCARBAZEPINE' => fn () => $one('µg/mL', 'Therapeutic: 3 - 35', [['A', 3, 35]]),
            'FLUID FOR PH' => fn () => $one('', '7.60 - 7.64 (pleural fluid)', [], 'Body fluid', 'pH'),
        ];
        foreach ($map as $pattern => $make) {
            if (self::has($u, $pattern)) {
                return $make();
            }
        }

        // Small panels
        if (self::has($u, 'CD3.*CD4.*CD8')) {
            return self::fmt('TABLE', [
                self::p('CD3 (T cells)', 'cells/µl', '700 - 2100', [['A', 700, 2100]]),
                self::p('CD4 (Helper T cells)', 'cells/µl', '500 - 1500', [['A', 500, 1500]]),
                self::p('CD8 (Suppressor T cells)', 'cells/µl', '200 - 1200', [['A', 200, 1200]]),
                self::p('CD4 / CD8 ratio', null, '1.0 - 4.0', [['A', 1.0, 4.0]], 'FORMULA', ['formula' => '[CD4 (Helper T cells)] / [CD8 (Suppressor T cells)]', 'decimals' => 2]),
            ], null, 'EDTA whole blood') + self::src('Common panel', 'Lymphocyte subsets - the ratio is calculated. Ranges are SAMPLES.');
        }
        if (self::has($u, 'FREE LIGHT CHAIN|SFLC')) {
            return self::fmt('TABLE', [
                self::p('Free Kappa', 'mg/L', '3.3 - 19.4', [['A', 3.3, 19.4]]),
                self::p('Free Lambda', 'mg/L', '5.7 - 26.3', [['A', 5.7, 26.3]]),
                self::p('Kappa / Lambda ratio', null, '0.26 - 1.65', [['A', 0.26, 1.65]], 'FORMULA', ['formula' => '[Free Kappa] / [Free Lambda]', 'decimals' => 2]),
            ], null, 'Serum') + self::src('Common panel', 'Free light chains - the ratio is calculated. Ranges are SAMPLES.');
        }
        if (self::has($u, 'FREE PSA')) {
            return self::fmt('TABLE', [
                self::p('Total PSA', 'ng/mL', '< 4.0', [['A', null, 4.0]]),
                self::p('Free PSA', 'ng/mL'),
                self::p('Free / Total PSA ratio', '%', '> 25', [['A', 25, null]], 'FORMULA', ['formula' => '[Free PSA] / [Total PSA] * 100', 'decimals' => 1]),
            ], null, 'Serum') + self::src('Common panel', 'PSA with the calculated free / total ratio. Ranges are SAMPLES.');
        }
        if (self::has($u, 'HOMA')) {
            return self::fmt('TABLE', [
                self::p('Fasting glucose', 'mg/dl', '70 - 100', [['A', 70, 100]]),
                self::p('Fasting insulin', 'µIU/mL', '2.6 - 24.9', [['A', 2.6, 24.9]]),
                self::p('HOMA-IR', null, '< 2.5', [['A', null, 2.5]], 'FORMULA', ['formula' => '[Fasting glucose] * [Fasting insulin] / 405', 'decimals' => 2]),
            ], null, 'Serum / Plasma') + self::src('Common panel', 'HOMA-IR is calculated from glucose and insulin. Ranges are SAMPLES.');
        }
        if (self::has($u, 'T3.*T4.*TSH')) {
            return self::fmt('TABLE', [
                self::p('T3 (Total)', 'ng/mL', '0.8 - 2.0', [['A', 0.8, 2.0]]),
                self::p('T4 (Total)', 'µg/dL', '5.1 - 14.1', [['A', 5.1, 14.1]]),
                self::p('TSH', 'µIU/mL', '0.27 - 4.2', [['A', 0.27, 4.2]]),
            ], null, 'Serum', '<p>Method: CLIA.</p>') + self::src('Common panel', 'Thyroid profile. Ranges are SAMPLES.');
        }
        if (self::has($u, 'METANEPHRINE')) {
            $normet = self::has($u, 'NON|NOR');
            return self::fmt('TABLE', [self::p($normet ? 'Normetanephrine' : 'Metanephrine', self::has($u, 'URINE|24') ? 'µg/24 hrs' : 'pg/mL',
                self::has($u, 'URINE|24') ? ($normet ? '< 600' : '< 350') : ($normet ? '< 196' : '< 65'),
                [['A', null, self::has($u, 'URINE|24') ? ($normet ? 600 : 350) : ($normet ? 196 : 65)]])], null, self::has($u, 'URINE|24') ? '24 hours urine' : 'Plasma')
                + self::src('Common analyte', 'Unit and a usual range were filled in - SAMPLE, check your method.');
        }
        return null;
    }

    private static function generic(string $name): array
    {
        return self::fmt('TABLE', [self::p($name ?: 'Result', null, null)])
            + self::src('Blank', 'One result named after the test. Fill in the unit and the normal range, or add more parameters.');
    }

    // ------------------------------------------------------------------ similar tests

    /** Tests with a format whose name looks like this one - to copy their format instead. */
    public static function similar(string $testCode, string $name, int $limit = 5): array
    {
        $tokens = fn ($s) => array_values(array_unique(array_filter(
            preg_split('/[^A-Z0-9]+/', strtoupper($s)),
            fn ($t) => $t !== '' && !in_array($t, ['OF', 'FOR', 'THE', 'AND', 'TEST', 'SERUM', 'BLOOD', 'LEVEL', 'WITH', 'STUDY', 'USG', 'DIGITAL'], true)
        )));
        $mine = $tokens($name);
        if (!$mine) {
            return [];
        }

        $scored = [];
        foreach (DB::table('tbl_web_test_formats')->where('test_code', '!=', $testCode)->get(['test_code', 'test_name', 'format_type']) as $f) {
            $theirs = $tokens($f->test_name ?? '');
            if (!$theirs) {
                continue;
            }
            $common = count(array_intersect($mine, $theirs));
            $score = $common / count(array_unique(array_merge($mine, $theirs)));
            if ($common > 0 && $score >= 0.34) {
                $scored[] = ['code' => $f->test_code, 'name' => trim((string) $f->test_name), 'type' => $f->format_type, 'score' => round($score, 2)];
            }
        }
        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);
        return array_slice($scored, 0, $limit);
    }
}

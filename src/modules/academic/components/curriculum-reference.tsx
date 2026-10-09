import { CDC_GENERAL_SECONDARY, CDC_SOURCE } from "../curriculum";

export function CurriculumReference() {
  return (
    <details className="mb-5 rounded-xl border bg-white p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-emerald-900">
        Nepal CDC subject setup guide
      </summary>
      <div className="mt-3 space-y-3 text-slate-600">
        <p>
          For the general stream in grades 9–10, configure these five compulsory
          subjects, then the two optional subjects actually offered by your
          school. Do not give every subject to every class.
        </p>
        <div className="flex flex-wrap gap-2">
          {CDC_GENERAL_SECONDARY.map((subject) => (
            <span
              key={subject.code}
              className="rounded-lg bg-slate-50 px-3 py-2"
            >
              {subject.name} · {subject.creditHour} credit hours
            </span>
          ))}
        </div>
        <p>
          Each optional subject carries 4 credit hours in this structure.
          Technical and traditional streams differ. Grades 1–3 use an integrated
          curriculum; grades 4–8 and 11–12 need their own subject and assessment
          configuration.
        </p>
        <p>
          Keep theory, practical and internal assessment separate. Enter the
          applicable component pass marks in Exam subjects. For grades 8, 10 and
          12, the grading directive specifies minimum theory grade D and
          internal grade C for certification. This ERP produces school progress
          reports, not official board certificates.
        </p>
        <p>
          Date fields use AD; you can name the academic year in BS. No automatic
          BS conversion is performed.
        </p>
        <a
          href={CDC_SOURCE}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline"
        >
          CDC curriculum, 2078 (general structure, page 7)
        </a>
        {" · "}
        <a
          href="https://www.moecdc.gov.np/content/22/letter-gradinging-directory--2078--fourth-amendment-2081-/"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Letter grading directive, fourth amendment 2081
        </a>
      </div>
    </details>
  );
}

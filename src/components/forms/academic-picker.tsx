"use client";
import { useState } from "react";
type Option = { id: string; name: string };
export type ClassSubjectOption = {
  academicYearId: string;
  classId: string;
  subjectId: string;
};
type Group = {
  academicYearId: string;
  classId: string;
  sectionId: string | null;
};
const style =
  "h-10 w-full rounded-lg border bg-white px-3 text-sm focus-visible:ring-2 focus-visible:ring-emerald-500";

export function AcademicPicker({
  years,
  classes,
  sections,
  subjects,
  links,
  groups,
  initial,
  optionalSection = false,
}: {
  years: Option[];
  classes: Option[];
  sections?: (Option & { classId: string })[];
  subjects?: Option[];
  links?: ClassSubjectOption[];
  groups?: Group[];
  initial?: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string | null;
    subjectId?: string;
  };
  optionalSection?: boolean;
}) {
  const [yearId, setYear] = useState(initial?.academicYearId ?? "");
  const [classId, setClass] = useState(initial?.classId ?? "");
  const [sectionId, setSection] = useState(initial?.sectionId ?? "");
  const [subjectId, setSubject] = useState(initial?.subjectId ?? "");
  const availableClasses = classes.filter(
    (item) =>
      !groups ||
      groups.some(
        (group) => group.academicYearId === yearId && group.classId === item.id,
      ),
  );
  const availableSections = sections?.filter(
    (item) =>
      item.classId === classId &&
      (!groups ||
        groups.some(
          (group) =>
            group.academicYearId === yearId &&
            group.classId === classId &&
            (!group.sectionId || group.sectionId === item.id),
        )),
  );
  const availableSubjects = subjects?.filter(
    (item) =>
      !links ||
      links.some(
        (link) =>
          link.academicYearId === yearId &&
          link.classId === classId &&
          link.subjectId === item.id,
      ),
  );
  return (
    <>
      <label className="block space-y-1 text-sm font-medium">
        Academic year
        <select
          name="academicYearId"
          value={yearId}
          onChange={(e) => {
            setYear(e.target.value);
            setClass("");
            setSection("");
            setSubject("");
          }}
          className={style}
          required
        >
          <option value="">Select year</option>
          {years.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Class
        <select
          name="classId"
          value={classId}
          onChange={(e) => {
            setClass(e.target.value);
            setSection("");
            setSubject("");
          }}
          className={style}
          required
          disabled={!yearId}
        >
          <option value="">Select class</option>
          {availableClasses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {sections && (
        <label className="block space-y-1 text-sm font-medium">
          Section
          <select
            name="sectionId"
            value={sectionId}
            onChange={(e) => setSection(e.target.value)}
            className={style}
            required={!optionalSection}
            disabled={!classId}
          >
            <option value="">
              {optionalSection ? "All sections" : "Select section"}
            </option>
            {availableSections?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {subjects && (
        <label className="block space-y-1 text-sm font-medium">
          Assigned subject
          <select
            name="subjectId"
            value={subjectId}
            onChange={(e) => setSubject(e.target.value)}
            className={style}
            required
            disabled={!classId}
          >
            <option value="">Select subject</option>
            {availableSubjects?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {classId && !availableSubjects?.length && (
            <span className="text-xs text-amber-700">
              Assign subjects in Class subjects first.
            </span>
          )}
        </label>
      )}
    </>
  );
}

export function MarkSheetPicker({
  subjects,
  sections,
  initial,
}: {
  subjects: (Option & { classId: string; sectionIds?: string[] })[];
  sections: (Option & { classId: string })[];
  initial: { examSubjectId?: string; sectionId?: string };
}) {
  const [subjectId, setSubject] = useState(initial.examSubjectId ?? "");
  const [sectionId, setSection] = useState(initial.sectionId ?? "");
  const selected = subjects.find((item) => item.id === subjectId);
  return (
    <>
      <label className="text-sm font-medium">
        Exam · class · subject
        <select
          name="examSubjectId"
          value={subjectId}
          className={style}
          required
          onChange={(e) => {
            setSubject(e.target.value);
            setSection("");
          }}
        >
          <option value="">Select exam subject</option>
          {subjects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Section
        <select
          name="sectionId"
          value={sectionId}
          className={style}
          required
          disabled={!selected}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="">Select section</option>
          {sections
            .filter(
              (item) =>
                item.classId === selected?.classId &&
                (!selected?.sectionIds ||
                  selected.sectionIds.includes(item.id)),
            )
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
    </>
  );
}

import { useState } from "react";
import { Field } from "~/components/forms/Field";
import type { TextDirection } from "~/shared/direction";

/**
 * A textarea for inline markup that owns its text. The block only ever receives the parsed
 * result; the field is never re-rendered from it, so half-typed markup (`*`, `==`, a trailing
 * newline) stays exactly as typed instead of being normalised away under the cursor.
 */
export function MarkupTextarea({
  label,
  hint,
  initialText,
  direction,
  rows,
  onText,
}: {
  label: string;
  hint: string;
  initialText: string;
  direction: TextDirection;
  rows: number;
  onText: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  return (
    <Field label={label} hint={hint}>
      <textarea
        className="field__input field__input--multiline"
        dir={direction}
        rows={rows}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onText(event.target.value);
        }}
      />
    </Field>
  );
}

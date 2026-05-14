# Facial Action Coding System (FACS) - Video Generation Guide

## 1. Overview
The Facial Action Coding System (FACS) is a comprehensive, anatomically based system for describing all visually discernible facial movement. It breaks down facial expressions into individual components called **Action Units (AUs)**.

In the context of the **Video Director Dashboard**, we use FACS codes within `motion_prompt` to precisely control character facial expressions and micro-expressions when generating video via Veo 3.1. By specifying exact AUs, we force the video generation model to portray highly specific emotional nuances that vague text prompts (like "sad" or "happy") cannot achieve.

## 2. Core Action Units (AUs) Reference
Below is the reference table of the most critical Action Units used for facial control:

### Upper Face AUs
* **AU 1 (Inner Brow Raiser):** Raises the inner portion of the eyebrows. Often associated with sadness, distress, or surprise.
* **AU 2 (Outer Brow Raiser):** Raises the outer portion of the eyebrows. Associated with surprise.
* **AU 4 (Brow Lowerer):** Lowers and pulls the eyebrows together (frowning). Associated with anger, concentration, or confusion.
* **AU 5 (Upper Lid Raiser):** Widens the eyes by raising the upper eyelid. Associated with fear or surprise.
* **AU 6 (Cheek Raiser):** Raises the cheeks and gathers skin around the eyes (creates "crow's feet"). A key component of a genuine (Duchenne) smile.
* **AU 7 (Lid Tightener):** Tightens the eyelids, narrowing the eye opening. Associated with anger or intense focus.

### Lower Face AUs
* **AU 9 (Nose Wrinkler):** Wrinkles the nose. Associated with disgust.
* **AU 10 (Upper Lip Raiser):** Raises the upper lip. Associated with disgust or contempt.
* **AU 12 (Lip Corner Puller):** Pulls the corners of the lips up and back (smiling).
* **AU 14 (Dimpler):** Tightens the corners of the lips inwards. Associated with contempt.
* **AU 15 (Lip Corner Depressor):** Pulls the corners of the lips down (frowning). Associated with sadness.
* **AU 17 (Chin Raiser):** Pushes the lower lip up. Associated with sadness, doubt, or defiance.
* **AU 20 (Lip Stretcher):** Stretches the lips horizontally. Associated with fear.
* **AU 23 (Lip Tightener):** Tightens the lips together. Associated with anger.
* **AU 24 (Lip Pressor):** Presses the lips firmly together. Associated with anger or holding back speech.
* **AU 25 (Lips Part):** Relaxes the lips so they separate slightly.
* **AU 26 (Jaw Drop):** Opens the mouth by dropping the jaw. Associated with surprise or shock.

## 3. Emotion Combinations (FACS Formulas)
To generate precise emotions in Veo 3.1, combine these AUs in the `motion_prompt`.

* **Genuine Happiness (Duchenne Smile):** `AU 6 + AU 12` (Cheek raiser + Lip corner puller)
* **Fake/Polite Smile (Pan-Am Smile):** `AU 12` alone (Lip corner puller without cheek raiser)
* **Sadness:** `AU 1 + AU 4 + AU 15` (Inner brow raiser + Brow lowerer + Lip corner depressor)
* **Surprise:** `AU 1 + AU 2 + AU 5 + AU 26` (Inner/Outer brow raiser + Upper lid raiser + Jaw drop)
* **Fear:** `AU 1 + AU 2 + AU 4 + AU 5 + AU 7 + AU 20 + AU 26` (Brows raised and drawn together, wide eyes, stretched lips)
* **Anger:** `AU 4 + AU 5 + AU 7 + AU 23` (Brow lowerer + Upper lid raiser + Lid tightener + Lip tightener)
* **Disgust:** `AU 9 + AU 15 + AU 17` (Nose wrinkler + Lip corner depressor + Chin raiser)
* **Contempt:** `AU 14` (Unilateral dimpler - tightening one corner of the lip)

## 4. Applying FACS to Veo 3.1 `motion_prompt`
When creating a `motion_prompt` for the Video Director, translate the desired emotion into a descriptive prompt that incorporates the physical movements of the AUs. Veo 3.1 responds exceptionally well to anatomical descriptions.

**Examples of injecting FACS into `motion_prompt`:**

* **Instead of:** *"The character looks very sad."*
* **Use FACS (AU 1+4+15):** *"The character's inner eyebrows raise and pull together (AU 1+4), while the corners of their lips depress downwards (AU 15). Subtle quivering of the chin (AU 17)."*

* **Instead of:** *"A genuine smile."*
* **Use FACS (AU 6+12):** *"The character pulls the corners of their lips up (AU 12) while raising their cheeks, creating visible crinkles around the outer eyes (AU 6)."*

* **Instead of:** *"He is extremely angry."*
* **Use FACS (AU 4+5+7+23):** *"His eyebrows lower and pull tightly together (AU 4), eyelids tighten (AU 7) with a hard stare, and his lips press thinly together in a tight line (AU 23)."*

## 5. Intensity Modifiers
FACS uses letters A-E to denote intensity. You can translate these into descriptive adverbs for Veo 3.1:
* **A (Trace):** "Barely perceptible", "slight hint of"
* **B (Slight):** "Subtle", "mild"
* **C (Marked):** "Clear", "distinct"
* **D (Severe):** "Intense", "strong"
* **E (Maximum):** "Extreme", "maximum extension"

*Example:* "A subtle pulling of the left lip corner (AU 14B) indicating mild contempt."

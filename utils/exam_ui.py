"""
utils/exam_ui.py — Exam practice question panel for WJEC Physics Simulations.

Usage in any sim page:
    from utils.exam_ui import show_exam_panel

    questions = [
        {
            "q": f"A ball launched at {angle:.0f}° with speed {v:.1f} m/s. Calculate the range.",
            "marks": 3,
            "answer": f"{range_val:.2f} m",
            "working": [
                f"Horizontal speed: v_x = {v:.1f} cos({angle:.0f}°) = {vx:.2f} m/s",
                f"Time of flight: t = 2v sinθ / g = {tof:.2f} s",
                f"Range: R = v_x × t = {range_val:.2f} m",
            ],
            "hint": "Split into horizontal and vertical components",
        },
    ]
    show_exam_panel(questions)
"""

import streamlit as st


def show_exam_panel(questions: list) -> None:
    """Render a collapsible WJEC-style exam practice panel.

    Each question dict must contain:
        q       : str       — question text (pre-formatted with numeric values)
        marks   : int       — mark allocation shown as badge
        answer  : str       — final answer string, e.g. "12.5 m"
        working : list[str] — optional step-by-step working lines
        hint    : str       — optional hint shown before the answer
    """
    if not questions:
        return

    st.divider()
    with st.expander("📝 Exam Practice Questions", expanded=False):
        st.caption(
            "Questions use your current slider values — adjust the controls above and the "
            "answers update automatically. Click **Show mark scheme** to reveal working."
        )
        for i, q in enumerate(questions):
            marks = int(q.get("marks", 1))
            mark_label = f"{marks} mark{'s' if marks != 1 else ''}"

            left, right = st.columns([10, 2])
            with left:
                st.markdown(f"**Q{i + 1}.** {q['q']}")
            with right:
                st.markdown(
                    f"<span style='background:#1f77b4;color:white;padding:2px 8px;"
                    f"border-radius:4px;font-size:0.8em'>{mark_label}</span>",
                    unsafe_allow_html=True,
                )

            hint = q.get("hint", "")
            if hint:
                st.caption(f"💡 Hint: {hint}")

            btn_key = f"exam_q{i}_{abs(hash(q['q'])) % 999983}"
            if st.button("Show mark scheme", key=btn_key, type="secondary"):
                with st.container(border=True):
                    working = q.get("working") or []
                    for step in working:
                        st.markdown(f"&nbsp;&nbsp;→ {step}")
                    st.success(f"**Answer: {q['answer']}**")

            if i < len(questions) - 1:
                st.write("")

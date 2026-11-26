# Experimental magnetic calibration

The application now provides a measurement-import, fitting, comparison and provenance workflow. **No physical apparatus has been calibrated in this task: no measured dataset was supplied.** The example CSV and regression fixtures are synthetic and are labelled as such.

## Collect measurements

Use the same bob, fixed magnet, orientation and support arrangement as the intended experiment. Record the bob's mass in kilograms. For each fixed separation, measure the attractive magnetic force along the line joining the effective magnetic centres. Distances must be **centre-to-centre distances in metres**, not horizontal distances or distances measured from an arbitrary housing edge.

Tare the force instrument and remove the weight/support contribution so the supplied force is magnetic force alone. Keep orientation fixed, repeat measurements and record their uncertainty. Cover the separation range actually visited by the pendulum. Separate datasets are appropriate for different fixed magnets; applying one fit to all three assumes equivalent magnets and geometry.

The application accepts 4–5000 rows and at least three distinct positive distances. Positive force denotes attraction. A central attractive model cannot represent a sign-changing or repulsive force dataset. If the measurements do not approximate a central inverse-square law, do not treat a fitted coefficient as validation of that law.

## CSV format

```csv
distance_m,force_N,uncertainty_N
```

Each subsequent row supplies distance, force and optional positive standard uncertainty in newtons. Omit the entire uncertainty column when uncertainties are unavailable. Blank cells, non-finite numbers and non-positive distances/forces are rejected. Lines beginning with `#` are comments.

## What is fitted

The configured point-attraction model predicts **F = K/r²**, where K is in N m². Weighted least squares uses 1/σ² weights when a complete uncertainty column is supplied; otherwise it uses equal weights. The intercept is fixed at zero. The fitted acceleration coefficient is **k = K / measured mass**, in m³/s².

The panel reports:

- fitted K and an estimated coefficient standard error;
- k after explicit mass conversion;
- force RMSE and leave-one-out prediction RMSE, both in newtons;
- ordinary R² and reduced χ² when uncertainties were supplied;
- a log-log fitted exponent p for the diagnostic relation F ∝ r⁻ᵖ.

The exponent is a **diagnostic**, not an automatically substituted physical law. Applying a fit retains the inverse-square model. A high R² or small fitting error over one distance range does not verify extrapolation, orientation independence, dynamic motion or an electromagnetic dipole model.

## Apply and preserve provenance

Enter the apparatus/data source, load or paste the CSV, and fit. Select an individual magnet or explicitly choose all three. **Load fitted k and measured mass into draft** changes visible draft parameters; **Apply & calculate** performs the numerical experiment. A compact fit summary persists with the investigation.

Export the calibration report to retain the **complete original measurements**, uncertainty column, fitted parameters, diagnostics, source and timestamp. Large raw datasets are not duplicated into every zoom-history entry. Preserve that report and the original CSV independently of browser storage.

For a meaningful physical validation, withhold some measured separations and compare predictions against them. Then compare simulated motion with independent recorded pendulum trajectories. Neither comparison can be completed using synthetic examples alone.

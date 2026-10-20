# Explainable research baseline; thresholds are examples, NOT clinically validated.
def detect(snapshot,webcam=None):
    labels=[]; evidence={}
    def add(label,why): labels.append(label);evidence[label]=why
    rt=snapshot.get('responseTimeMs')
    if rt is not None and rt>15000:add('hesitation','responseTimeMs > 15000')
    if rt is not None and rt<800:add('fast_answering','responseTimeMs < 800')
    if snapshot.get('maxIncorrectStreak',0)>=3:add('repeated_incorrect_attempts','three consecutive incorrect submissions')
    if snapshot.get('answerChanges',0)>=3:add('repeated_answer_changes','three answer revisions')
    if snapshot.get('inactivityDurationMs',0)>=5000 or snapshot.get('longPauseDetected'):add('inactivity','pause detected')
    if rt is not None and rt<800 and snapshot.get('maxIncorrectStreak',0)>=2:add('possible_impulsive_behaviour','fast response with repeated mistakes')
    if webcam and webcam.get('reliable') and webcam.get('gazeAway') and snapshot.get('inactivityDetected'):
        add('possible_distraction','gaze away plus gameplay inactivity')
    return {'states':labels,'evidence':evidence,'model':'rules_v1','clinicalDiagnosis':False}

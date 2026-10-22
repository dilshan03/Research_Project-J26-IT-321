from app.processors.behaviour_detector import detect

def fuse(snapshot,webcam=None):
    valid=bool(webcam and webcam.get('reliable'))
    result=detect(snapshot,webcam if valid else None)
    result['mode']='multimodal_rules' if valid else 'gameplay_only'
    result['webcamReliable']=valid
    return result

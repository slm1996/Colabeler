/**
 * Created by chenyi on 2018/4/26.
 */
function formatDoc(doc) {
    let annotation = "";
    for(let i in doc.outputs.annotation){
        let ann = doc.outputs.annotation[i];
        if(ann.class){
            annotation += "C"+(ann.class.id)+"\t"+ann.class.value+"\n";
        }
    }
    return annotation;
}

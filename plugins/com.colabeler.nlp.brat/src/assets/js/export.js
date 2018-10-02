/**
 * Created by chenyi on 2018/4/26.
 */
function formatDoc(doc) {
    let annotation = "";
    if(doc.outputs.annotation){
        if(!doc.outputs.annotation.T){
            for(let i in doc.outputs.annotation){
                let ann = doc.outputs.annotation[i];
                if(ann.entity){//旧版导出
                    annotation += "T"+(ann.entity.id)+"\t"
                        +ann.entity.name+" "+ann.entity.start+" "+ann.entity.end+"\t"
                        +ann.entity.text+"\n";
                }
            }
        }else{
            let data_T = doc.outputs.annotation.T,
                data_E = doc.outputs.annotation.E,
                data_R = doc.outputs.annotation.R;
            data_A =  doc.outputs.annotation.A;
            for(let T_ID in data_T){
                if(!data_T[T_ID]) continue;
                annotation += "T"+T_ID+"\t"+data_T[T_ID].name+" "+data_T[T_ID].start+" "+data_T[T_ID].end+"\t"+data_T[T_ID].value+"\n";
                if(data_T[T_ID].type === 'E'){
                    annotation += "E"+data_T[T_ID].E_ID+"\t"+data_T[T_ID].name+":T"+T_ID;
                    for(let to in data_E[data_T[T_ID].E_ID].participants){
                        for(let role in data_E[data_T[T_ID].E_ID].participants[to]){
                            annotation += " "+role+":T"+to;
                        }
                    }
                    annotation+="\n";
                }
                for(let i in data_T[T_ID].attributes){
                    let attribute = data_A[data_T[T_ID].attributes[i]];
                    annotation += "A"+data_T[T_ID].attributes[i]+"\t"+attribute.name+" "+data_T[T_ID].type;
                    annotation += data_T[T_ID].type === 'T'?T_ID:data_T[T_ID].E_ID;
                    if(attribute.value){
                        annotation += " "+attribute.value;
                    }
                    annotation+="\n";
                }
            }
            for(let R_ID in data_R){
                if(!data_R[R_ID]) continue;
                annotation += "R"+R_ID+"\t"+data_R[R_ID].name+" "+data_R[R_ID].arg1+":T"+data_R[R_ID].from+" "+data_R[R_ID].arg2+":T"+data_R[R_ID].to+"\n";
            }
        }
    }
    return annotation;
}

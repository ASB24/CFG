var button = document.querySelectorAll(".btn");
button.forEach(btn => btn.addEventListener( "click", function(){
    processRules(btn.id, populateReglas());
} ));

//Funciones principales
//Inciar set de reglas

var extras = new Map();

//Separa las reglas y sus producciones en un mapa de sets
function populateReglas(){
    var texto = (<HTMLInputElement>document.getElementById('reglas')).value;

    var reglas = new Map();

    if(texto != ""){
        let lineas = <string[]>texto.split("\n");
        lineas.forEach(linea => {
            var terminos = [];
            var nombre = "";

            nombre = linea.split(">")[0].trim();
            reglas.set(nombre, new Set());

            terminos = linea.split(">")[1].split("|");
            terminos.forEach(termino => reglas.get(nombre).add( termino.trim() ));
        });
    }
    return reglas;
}

function processRules(id: string, reglas: Map<string, Set<string>>){
    //Realizar el algoritmo segun el ID del boton presionado
    if(id == 'PU'){
        ProducUnitAlgo(reglas);
    }else if(id == 'C'){
        ChomskyAlgo(reglas);
    }else if(id == 'G'){
        GreibachAlgo(reglas);
    }

    //Display en el textarea de resultados
    var formula = ""
    var texto = ""
    for( let [regla, terminos] of reglas ){
        formula = regla+" > ";
        terminos.forEach(termino => formula += termino+" | ");
        formula = formula.substring(0, formula.length-3); // quitar el ultimo " | "
        texto+=formula+"\n";
    }
    texto+="\n";
    for( let [key, value] of extras ){
        texto+=key+" > "+value+"\n";
    }

    //Pone todos las letras en forma C_x en subscript
    texto = texto.replaceAll("_","");
    texto = texto.replace(/(\d)/g,`<sub>$1</sub>`);
    texto = texto.replace(/\n/g,`<br>`); // Todos los \n a <br> para que se lea en HTML

    document.getElementById("respuesta").innerHTML = texto;
    
    extras = new Map(); //Reiniciar el mapa de variables extra para reproduccion de algoritmos
}

function ProducUnitAlgo(reglas: Map<string, Set<string>>){
    //Elminar terminos unitarios y agergarlos a H
    var H = new Set<{regla: string, termino: string}>();
    for( let [regla, terminos] of reglas ){
        for( let termino of terminos){
            if(termino.length == 1 && termino == termino.toUpperCase()){
                H.add( {regla: regla,termino: termino} );
                terminos.delete(termino);
            }
        }
    }

    //Agregar parejas transitivas ( A->B, B->C entonces A->C )
    var nuevasParejas = new Set<{regla: string, termino: string}>();
    for( let pareja of H ){
        for( let compare of H ){
            if(pareja.termino == compare.regla) {
                nuevasParejas.add({regla: pareja.regla, termino: compare.termino});
            }
        }
    }
    //Agregar las nuevas parejas a H
    for( let pareja of nuevasParejas ){
        H.add({regla: pareja.regla, termino: pareja.termino});
    }

    //Agregar terminos segun las parejas encontradas en H
    for( let [regla, valores] of reglas ){
        for( let pareja of H ){
            if(pareja.termino == regla){
                valores.forEach( termino => reglas.get(pareja.regla).add(termino) );
            }
        }
    }
    
}

function ChomskyAlgo(reglas: Map<string, Set<string>>){
    var alfabeto = "LMNOPQRTUVWXYZ"; //Para variables nuevas
    var terminal_cnt = 0; //Para variables formato C_x
    var replace_cnt = 0; //Indice para iterar sobre las letras usadas para variables nuevas
    var temp = "";
    for(let [regla, terminos] of reglas){
        for(let termino of terminos){
            for(let i=0; i<termino.length; i++){
                
                //Terminales a forma Chomsky (C_x)
                if( termino.charAt(i) == termino.charAt(i).toLowerCase() && termino.charAt(i-1) != "_" && termino.charAt(i) != "_" ){
                    if( !extras.has(termino.charAt(i)) ){
                        extras.set(termino.charAt(i), "C_"+terminal_cnt);
                        terminal_cnt++;
                    }
                } 
                

                //No terminales a nuevas variables (AA -> D)
                if( termino.charAt(i) == termino.charAt(i).toUpperCase() && termino.charAt(i-1) != "_" && termino.charAt(i) != "_" && termino.charAt(i+1) == termino.charAt(i) ){
                    temp = termino.charAt(i)+termino.charAt(i);
                    if( !extras.has(temp) ){
                        extras.set( temp, alfabeto[replace_cnt] );
                        replace_cnt++;
                    }
                }
                
            }
        }

        //Utilizar todas las reglas extra sobre los terminos de cada regla
        var tempSet;
        for(let [regla, terminos] of reglas){
            tempSet = new Set();
            for(let termino of terminos){
                temp = termino;
                for(let [key, replace] of extras){
                    temp = temp.replace(key, replace);
                }
                tempSet.add(temp);
            }

            reglas.set(regla, tempSet);
        }

    }
}

function GreibachAlgo(reglas: Map<string, Set<string>>){
    let tempSet = new Set<string>()
    let newRules = []
    let recursive = []
    extras = new Map()

    for( let [regla, producciones] of reglas ){
        for( let prod of producciones ){
            if( prod.length == 1 && prod == prod.toLowerCase() && extras.get(prod) == undefined && !recursive.includes(regla) ){
                extras.set(prod, prod.toUpperCase())
                continue
            }
            for( let term of prod ){
                if( term == "S" ){
                    reglas.set("S'",new Set<string>("S"))
                }else if( term == term.toUpperCase() && reglas.get(term) != undefined && regla == term ){ //Recursion a la izquierda
                    recursive.push(regla)
                    for( let [regla, producciones] of reglas ){
                        for( prod of producciones ){
                            if(regla != term && prod.includes(term) && !newRules.includes(prod)){
                                let string = prod.replace(term, '')
                                for( let produ of reglas.get(term)){
                                    producciones.add(string+produ)
                                    newRules.push(string+produ)
                                }
                                producciones.delete(prod)
                            }
                        }
                    }

                }
            }
        }
    }

    for(let [regla, terminos] of reglas){
        tempSet = new Set();
        for(let termino of terminos){
            let temp = termino;
            for(let [key, replace] of extras){
                temp = temp.replace(key, replace);
            }
            tempSet.add(temp);
        }

        reglas.set(regla, tempSet);
    }
}

// let alpha = "♠";
//     let beta = "♦"
//     let tempSet = new Set<string>();
//     //1
//     for( let rule of reglas.keys() ){

//         //1.1
//         for (let compare of reglas.keys()) {
//             if( rule != compare ) break;
//             for( let termino of reglas.get(rule) ){
//                 //1.1.1
//                 if( termino.normalize() === (compare+alpha).normalize() ){
//                     tempSet = reglas.get(rule);
//                     for( let prod of tempSet ){
//                         //1.1.1.1
//                         if( prod.normalize() === beta ){
//                             tempSet.add(beta+alpha);
//                         }
//                     }
//                     tempSet.delete(compare+alpha);
//                     reglas.set( rule, tempSet );
//                 }
//             }
//         }

//         //1.2
//         let alfabeto = "LMNOPQRTUVWXYZ"; //Para variables nuevas
//         let cnt = 0;
//         let alphaCnt = 0;
//         for( let [regla, prod] of reglas ){
//             if( prod.has( regla+alpha ) ){

//                 //1.2.1
//                 reglas.set( alfabeto[cnt], new Set<string>() );

//                 //1.2.2
//                 prod.forEach( termino => function(){
//                     if( termino.normalize() === (regla+alpha).normalize() ){
                        
//                         //1.2.2.1
//                         tempSet = reglas.get(alfabeto[cnt]);
//                         tempSet.add(alpha+alphaCnt+alfabeto[cnt]);
//                         alphaCnt++;
//                         reglas.set( alfabeto[cnt], tempSet );

//                         //1.2.2.2
//                         prod.delete(regla+alpha);
//                         cnt++;

//                     }
//                 });

//                 reglas.set(regla, tempSet);

//             }else if( prod.has( beta ) ){
//                 tempSet = reglas.get(regla);
//                 tempSet.add(beta+alfabeto[cnt]);
//                 cnt++;
//                 reglas.set(regla, tempSet);
//             }
//         }

//     }
(function(window){
    //定义Promise
    function Promise(excutor){
        //缓存this
        const self = this
        //设定初始状态
        self.status = 'pending'
        self.data = undefined
        self.callbacks = [] //// 用来存储待执行的成功和失败的回调的数组容器, 每个元素的结构: {onResolved(){}, onRejected(){}}
        //定义resolve
        function resolve(value){
            //如果一开始就不是pending状态，那么之后的逻辑就不会走了，因为，状态只有两个变化pending---resolved,pending---rejected
            if(self.status !== 'pending'){
                return
            }
            //1.修改状态
            self.status = 'resolved'
            //2.存储成功的value
            self.data = value
            //3.可能会调用已经存在的成功的回调函数（放在数组）
            if(self.callbacks.length > 0){
                //////////
                setTimeout(()=>{
                    self.callbacks.forEach((callbackObj)=>{
                        callbackObj.onResolved(value)
                    })
                },0)
            }
        }
        //定义reject
        function reject(reason){
            if(self.status !== 'pending'){
                return
            }
            //1.修改状态
            self.status = 'rejected'
            //2.存储失败的reason
            self.data = reason
            //3.可能会调用已经存在的失败的回调函数（放在数组）
            if(self.callbacks.length > 0){
                setTimeout(()=>{
                    self.callbacks.forEach((callbackObj)=>{
                        callbackObj.onRejected(reason) 
                    })
                },0)
            }
        }

        //同步执行执行器函数excutor
        try{
            excutor(resolve,reject)
        }catch(error){
            reject(error)
        }
        

    }

    //定义.then方法，给promise使用的，所以是在原型上定义的   用来指定成功和失败的回调函数
    Promise.prototype.then = function (onResolved,onRejected) {

        const self = this
        //有可能我们调用.then方法时候传过来的是null,这时候我们需要对onResolve,onReject进行初始值的一个设定

         //如果不是function那么就给他一个成功结果，就会将value传给下一个.then
        onResolved = typeof onResolved === 'function' ? onResolved : value => value

        // 如果不是function 就让他返回promise失败, 值为reason，并且一直 throw 异常，一直到达catch 中，这也是，错误透传的原理
        onRejected = typeof onRejected === 'function' ? onRejected : reason => {throw reason}

        
        return new Promise((resolve,reject)=>{

            function handle (callback){
                try{
                    const result = callback(self.data)
                    if(result instanceof Promise){
                        // result.then(
                        //     (value)=>{resolve(value)},
                        //     (reason)=>{reject(reason)}
                        // )
                        //简写方式
                        result.then(resolve,reject)//因为是回调函数，不需要我们自己去调用，当状态改变时，就会调用对应的成功或失败回调函数
                    }else{
                        resolve(result)
                    }
                }catch(error){
                    reject(error)
                }
            }
            //通过判断当前的状态来确定什么时候执行成功或失败的回调函数

            //执行的成功或失败回调函数需要放在回调队列的微队列中，但是利用js操作微队列过于繁琐，利用定时器将其放置在宏队列中

            if(self.status === 'resolved'){//成功状态立即执行成功的回调函数
                setTimeout(()=>{
                    handle(onResolved)

                },0)
            }
            else if(self.status === 'rejected'){//失败状态立即执行失败的回调函数
                setTimeout(()=>{
                    handle(onRejected)
                    
                },0)
            }
            else{//初始状态，没有确定状态，将其先存储在定义好的回调数组容器中
                self.callbacks.push({
                    onResolved  (){
                        handle(onResolved)
                    },
                    onRejected (){
                        handle(onRejected)
                    } 
                })
            }
        })
    }
     //定义.catch方法，给promise使用的，所以是在原型上定义的  只用来指定失败的回调函数
     Promise.prototype.catch = function (onReject) {
        return this.then(null,onReject)
    }

    // 用来返回一个成功/失败的promise的静态方法  接收的可能是一个新的promise对象
    Promise.resolve = function(value){
        return new Promise((resolve,reject)=>{
            if(value instanceof Promise){
                value.then(resolve,reject)
            }else{
                resolve(value)
            }
        })
    }

    // 用来返回一个失败的promise的静态方法  只能是一般reason，不会是promise对象
    Promise.reject = function(reason){
        return new Promise ((resolve,reject)=>{
            reject(reason)
        })
    }


    // 用来延迟返回一个成功/失败的promise的静态方法  接收的可能是一个新的promise对象
    Promise.resolveDelay = function(value,time){
        return new Promise((resolve,reject)=>{
            setTimeout(()=>{
                if(value instanceof Promise){
                    value.then(resolve,reject)
                }else{
                    resolve(value)
                }
            },time)
        })
    }

    // 用来延迟返回一个失败的promise的静态方法  只能是一般reason，不会是promise对象
    Promise.rejectDelay = function(reason,time){
        return new Promise ((resolve,reject)=>{
            setTimeout(()=>{
                reject(reason)
            },time)
        })
    }


    Promise.all = function(promises){
        const length = promises.length
        let values = new Array (length)
        let resolveCount = 0
        return new Promise((resolve,reject)=>{
            
            promises.forEach((p,index)=>{
                Promise.resolve(p).then(//因为p可能不是promise   所以需要将p 包一层promise  处理起来更加方便
                    value=>{
                        resolveCount++
                        values[index] = value;
                        if(resolveCount === length){ 
                            resolve(values)
                        }else{

                        }
                    },
                    reason=>{
                        reject(reason)
                    }
                )
            })
        })
    }
    Promise.race = function(promises){
        return new Promise((resolve,reject)=>{
            promises.forEach(p=>{
                Promise.resolve(p).then(//因为p可能不是promise   所以需要将p 包一层promise  处理起来更加方便
                    value=>{
                        resolve(value)//此时会多次调用resolve与reject，但是我们在之前进行了限制，只能改变一次状态
                    },
                    reason=>{
                        reject(reason)
                    }
                )
            })
        })
    }
    //利用window进行暴露
    window.Promise = Promise
})(window);
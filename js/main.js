// スクロール出現（スライドアップ 20px→0 / 0.5s、ステガー 0.1s）
(function(){
  var items = document.querySelectorAll('.reveal');
  if(!('IntersectionObserver' in window)){
    items.forEach(function(el){el.classList.add('show');});
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e,i){
      if(e.isIntersecting){
        setTimeout(function(){e.target.classList.add('show');}, (i%4)*100);
        io.unobserve(e.target);
      }
    });
  },{threshold:.15});
  items.forEach(function(el){io.observe(el);});
})();

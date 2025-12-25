const itemsDiv = document.getElementById("items")
const search = document.getElementById("search")

let cart = JSON.parse(localStorage.getItem("cart") || "[]")

function updateCartUI(){
  document.getElementById("count").innerText = cart.length
  const cartItems = document.getElementById("cartItems")
  let total = 0

  cartItems.innerHTML = cart.map(i=>{
    total += i.price
    return `<div class="cart-item">
      <span>${i.name}</span>
      <b>Rs ${i.price}</b>
    </div>`
  }).join("")

  document.getElementById("total").innerText = total
  localStorage.setItem("cart", JSON.stringify(cart))
}

async function load(q=""){
  const res = await fetch(`/api/items?search=${q}`)
  const items = await res.json()

  itemsDiv.innerHTML = items.map(i=>`
    <div class="card">
      <img src="${i.image}">
      <h3>${i.name}</h3>
      <p>${i.description}</p>
      <div class="price">Rs ${i.price}</div>
      <button class="btn" onclick='addCart(${JSON.stringify(i)})'>
        Add to Cart
      </button>
    </div>
  `).join("")
}

function addCart(item){
  cart.push(item)
  updateCartUI()
}

function openCart(){
  document.getElementById("cartModal").style.display="flex"
}

function closeCart(){
  document.getElementById("cartModal").style.display="none"
}

search.oninput = e => load(e.target.value)

updateCartUI()
load()
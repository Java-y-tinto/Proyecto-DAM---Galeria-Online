import { Component, OnInit, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-producto',
  imports: [CurrencyPipe,RouterLink],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.scss'
})
export class ProductoComponent implements OnInit {
  @Input() id?: string = "";
  @Input() nombre: string = "Nombre no disponible";
  @Input() precio: string = "0";
  @Input() imageSrc: string = "https://placehold.co/600x400";
  @Input() categoria? : string = "oleo";
  @Input() descripcion: string = "";

  ngOnInit(): void {
      console.log(this.imageSrc);
  }

}

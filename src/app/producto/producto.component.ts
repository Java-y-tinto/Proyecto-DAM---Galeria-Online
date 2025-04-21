import { Component, OnInit, Input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
@Component({
  selector: 'app-producto',
  imports: [CurrencyPipe],
  templateUrl: './producto.component.html',
  styleUrl: './producto.component.scss'
})
export class ProductoComponent implements OnInit {
  @Input() id?: string = "";
  @Input() nombre: string = "Nombre no disponible";
  @Input() precio: string = "0";
  @Input() imageSrc: string = "";
  @Input() categoria? : string = "";
  @Input() descripcion: string = "";

  ngOnInit(): void {

  }

}
